import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User } from '../models/user.model';
import { ChildProfile } from '../models/childProfile.model';
import { Task } from '../models/task.model';
import { CaughtPokemon } from '../models/caughtPokemon.model';
import { Pokemon } from '../models/pokemon.model';
import { Reward } from '../models/reward.model';
import { RewardRequest } from '../models/rewardRequest.model';
import { AppError } from '../middlewares/errorHandler.middleware';
import { calcLevel } from './pokemon.service';

const SALT_ROUNDS = 10;

export interface ActivePokemonSummary {
  pokedexNumber: number;
  name: string;
  level: number;
}

export interface ChildSummary {
  id: number;
  username: string;
  displayName: string;
  avatarColor: string | null;
  isActive: boolean;
  coins: number;
  xp: number;
  activePokemon: ActivePokemonSummary | null;
  pendingReviewCount: number;
  pendingRewardRequestCount: number;
}

export interface DashboardData {
  children: ChildSummary[];
  totalInReview: number;
  totalPendingRequests: number;
}

async function buildChildSummaries(familyId: string): Promise<{
  children: ChildSummary[];
  totalInReview: number;
  totalPendingRequests: number;
}> {
  const users = await User.findAll({
    where: { familyId, role: 'child' },
    include: [{ model: ChildProfile, as: 'childProfile' }],
    order: [['createdAt', 'ASC']],
  });

  const childIds = users.map((u) => u.id);
  if (!childIds.length) {
    return { children: [], totalInReview: 0, totalPendingRequests: 0 };
  }

  // Active pokemon per child in one query
  const activeCaught = await CaughtPokemon.findAll({
    where: { childId: { [Op.in]: childIds }, isActive: true },
    include: [{ model: Pokemon, as: 'pokemon' }],
  });
  const pokemonMap: Record<number, typeof activeCaught[0]> = {};
  for (const cp of activeCaught) pokemonMap[cp.childId] = cp;

  // InReview tasks per child
  const reviewTasks = await Task.findAll({
    where: { familyId, status: 'InReview' },
    attributes: ['assignedTo'],
  });
  const reviewCountMap: Record<number, number> = {};
  for (const t of reviewTasks) {
    reviewCountMap[t.assignedTo] = (reviewCountMap[t.assignedTo] ?? 0) + 1;
  }

  // Pending reward requests per child for this family
  const familyRewards = await Reward.findAll({ where: { familyId }, attributes: ['id'] });
  const rewardIds = familyRewards.map((r) => r.id);
  const pendingRequestsList = rewardIds.length
    ? await RewardRequest.findAll({
        where: { rewardId: { [Op.in]: rewardIds }, status: 'Pending' },
      })
    : [];

  const requestCountMap: Record<number, number> = {};
  let totalPendingRequests = 0;
  for (const r of pendingRequestsList) {
    requestCountMap[r.childId] = (requestCountMap[r.childId] ?? 0) + 1;
    totalPendingRequests++;
  }

  const children: ChildSummary[] = users.map((u) => {
    const profile  = (u as any).childProfile as ChildProfile | null;
    const cp       = pokemonMap[u.id];
    const pokemon  = cp ? ((cp as any).pokemon as Pokemon) : null;

    return {
      id: u.id,
      username: u.username,
      displayName: profile?.displayName ?? u.username,
      avatarColor: profile?.avatarColor ?? null,
      isActive: u.isActive,
      coins: profile?.coins ?? 0,
      xp: profile?.xp ?? 0,
      activePokemon: pokemon
        ? { pokedexNumber: pokemon.pokedexNumber, name: pokemon.name, level: calcLevel(cp.pokemonXp) }
        : null,
      pendingReviewCount: reviewCountMap[u.id] ?? 0,
      pendingRewardRequestCount: requestCountMap[u.id] ?? 0,
    };
  });

  return { children, totalInReview: reviewTasks.length, totalPendingRequests };
}

export const adminService = {
  /** Full dashboard summary — HU-29 */
  async getDashboard(familyId: string): Promise<DashboardData> {
    return buildChildSummaries(familyId);
  },

  /** Children list with profile + active pokemon — HU-30 */
  async getChildren(familyId: string): Promise<ChildSummary[]> {
    const { children } = await buildChildSummaries(familyId);
    return children;
  },

  /** Single child summary — used by ChildDetail page */
  async getChildSummary(childId: number, adminFamilyId: string): Promise<ChildSummary> {
    const user = await User.findOne({
      where: { id: childId, familyId: adminFamilyId, role: 'child' },
      include: [{ model: ChildProfile, as: 'childProfile' }],
    });
    if (!user) throw new AppError(404, 'Hijo no encontrado');

    const cp = await CaughtPokemon.findOne({
      where: { childId, isActive: true },
      include: [{ model: Pokemon, as: 'pokemon' }],
    });
    const pokemon = cp ? ((cp as any).pokemon as Pokemon) : null;
    const reviewCount = await Task.count({ where: { assignedTo: childId, status: 'InReview' } });
    const profile = (user as any).childProfile as ChildProfile | null;

    return {
      id: user.id, username: user.username,
      displayName: profile?.displayName ?? user.username,
      avatarColor: profile?.avatarColor ?? null,
      isActive: user.isActive,
      coins: profile?.coins ?? 0, xp: profile?.xp ?? 0,
      activePokemon: pokemon && cp
        ? { pokedexNumber: pokemon.pokedexNumber, name: pokemon.name, level: calcLevel(cp.pokemonXp) }
        : null,
      pendingReviewCount: reviewCount,
    };
  },

  /** Edit displayName and/or password — HU-30 */
  async updateChild(
    childId: number,
    dto: { displayName?: string; password?: string },
    adminFamilyId: string
  ): Promise<void> {
    const user = await User.findOne({
      where: { id: childId, familyId: adminFamilyId, role: 'child' },
    });
    if (!user) throw new AppError(404, 'Hijo no encontrado');

    if (dto.password) {
      const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
      await user.update({ passwordHash });
    }
    if (dto.displayName) {
      const profile = await ChildProfile.findOne({ where: { userId: childId } });
      if (profile) await profile.update({ displayName: dto.displayName });
    }
  },

  /** Deactivate or reactivate a child account — HU-30 */
  async toggleChildStatus(childId: number, isActive: boolean, adminFamilyId: string): Promise<void> {
    const user = await User.findOne({
      where: { id: childId, familyId: adminFamilyId, role: 'child' },
    });
    if (!user) throw new AppError(404, 'Hijo no encontrado');
    await user.update({ isActive });
  },

  /** Lightweight notification counts for the navbar — HU-32 */
  async getNotifications(familyId: string): Promise<{ inReview: number; pendingRequests: number }> {
    const inReview = await Task.count({ where: { familyId, status: 'InReview' } });

    const familyRewards = await Reward.findAll({ where: { familyId }, attributes: ['id'] });
    const rewardIds = familyRewards.map((r) => r.id);
    const pendingRequests = rewardIds.length
      ? await RewardRequest.count({ where: { rewardId: { [Op.in]: rewardIds }, status: 'Pending' } })
      : 0;

    return { inReview, pendingRequests };
  },
};
