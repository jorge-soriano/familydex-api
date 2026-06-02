import { Op } from 'sequelize';
import { ChildProfile } from '../models/childProfile.model';
import { Transaction, TransactionType } from '../models/transaction.model';
import { User } from '../models/user.model';
import { CaughtPokemon } from '../models/caughtPokemon.model';
import { AppError } from '../middlewares/errorHandler.middleware';
import { pokemonService, EvoResult } from './pokemon.service';

export interface BalanceResult {
  coins: number;
  xp: number;
  maxPokemon: number;      // starter slot + floor(xp/5000)
  caughtCount: number;
  pendingCaptures: number;
}

export interface HistoryFilters {
  type?: TransactionType;
  from?: string;
  to?: string;
}

export const economyService = {
  /** Awards coins + XP. XP is always additive. Wires into pokemonService. */
  async addCoinsAndXp(
    childUserId: number,
    coins: number,
    xp: number,
    description: string,
    taskId?: number
  ): Promise<{ evolutionResult?: EvoResult }> {
    const profile = await ChildProfile.findOne({ where: { userId: childUserId } });
    if (!profile) throw new AppError(404, 'Perfil de hijo no encontrado');

    await profile.update({ coins: profile.coins + coins, xp: profile.xp + xp });

    await Transaction.create({
      childId: childUserId, taskId: taskId ?? null,
      type: 'TaskReward', coinsDelta: coins, xpDelta: xp, description,
    });

    const evolutionResult = await pokemonService.addXpToActive(childUserId, xp);
    return evolutionResult ? { evolutionResult } : {};
  },

  /** Deducts coins from a child (floor at 0). XP is never affected. HU-13 */
  async applyPenalty(childUserId: number, amount: number, reason: string): Promise<void> {
    const profile = await ChildProfile.findOne({ where: { userId: childUserId } });
    if (!profile) throw new AppError(404, 'Perfil de hijo no encontrado');

    const deducted = Math.min(amount, profile.coins);
    await profile.update({ coins: profile.coins - deducted });

    await Transaction.create({
      childId: childUserId, type: 'Penalty',
      coinsDelta: -deducted, xpDelta: 0, description: reason,
    });
  },

  /** Returns coins, XP and Pokémon capture stats for a child. HU-14 */
  async getBalance(childUserId: number): Promise<BalanceResult> {
    const profile = await ChildProfile.findOne({ where: { userId: childUserId } });
    if (!profile) throw new AppError(404, 'Perfil de hijo no encontrado');

    const maxPokemon  = 1 + Math.floor(profile.xp / 5000); // starter slot + earned slots
    const caughtCount = await CaughtPokemon.count({ where: { childId: childUserId } });

    return {
      coins: profile.coins, xp: profile.xp, maxPokemon, caughtCount,
      pendingCaptures: Math.max(0, maxPokemon - caughtCount),
    };
  },

  /** Returns transaction history for a child. HU-15 */
  async getHistory(childUserId: number, filters: HistoryFilters = {}): Promise<Transaction[]> {
    const where: Record<string, unknown> = { childId: childUserId };
    if (filters.type) where.type = filters.type;
    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range[Op.gte as unknown as string] = new Date(filters.from);
      if (filters.to)   range[Op.lte as unknown as string] = new Date(filters.to);
      where.createdAt = range;
    }
    return Transaction.findAll({ where, order: [['createdAt', 'DESC']] });
  },

  /** Returns all family transactions, optionally filtered by child. HU-16 */
  async getFamilyHistory(
    familyId: string,
    filters: HistoryFilters & { childId?: number } = {}
  ): Promise<Transaction[]> {
    const childWhere: Record<string, unknown> = { familyId, role: 'child' };
    if (filters.childId) childWhere.id = filters.childId;
    const children = await User.findAll({ where: childWhere, attributes: ['id'] });
    const childIds = children.map((u) => u.id);
    if (!childIds.length) return [];

    const where: Record<string, unknown> = { childId: { [Op.in]: childIds } };
    if (filters.type) where.type = filters.type;
    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range[Op.gte as unknown as string] = new Date(filters.from);
      if (filters.to)   range[Op.lte as unknown as string] = new Date(filters.to);
      where.createdAt = range;
    }
    return Transaction.findAll({ where, order: [['createdAt', 'DESC']] });
  },

  /** Verifies a child belongs to a family; throws 403 otherwise. */
  async assertChildInFamily(childUserId: number, familyId: string): Promise<void> {
    const user = await User.findOne({
      where: { id: childUserId, familyId, role: 'child', isActive: true },
    });
    if (!user) throw new AppError(403, 'Hijo no pertenece a esta familia');
  },
};
