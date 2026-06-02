import { Reward } from '../models/reward.model';
import { RewardRequest } from '../models/rewardRequest.model';
import { ChildProfile } from '../models/childProfile.model';
import { Transaction } from '../models/transaction.model';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/errorHandler.middleware';

export interface CreateRewardDto {
  name: string;
  description?: string;
  coinCost: number;
  isActive?: boolean;
}

export interface EditRewardDto {
  name?: string;
  description?: string;
  coinCost?: number;
}

export const rewardService = {
  // ── Admin CRUD ─────────────────────────────────────────────────────────────

  async createReward(dto: CreateRewardDto, familyId: string): Promise<Reward> {
    return Reward.create({
      familyId,
      name: dto.name,
      description: dto.description ?? null,
      coinCost: dto.coinCost,
      isActive: dto.isActive ?? true,
    });
  },

  async editReward(id: number, dto: EditRewardDto, familyId: string): Promise<Reward> {
    const reward = await Reward.findOne({ where: { id, familyId } });
    if (!reward) throw new AppError(404, 'Recompensa no encontrada');
    await reward.update(dto);
    return reward;
  },

  async setActive(id: number, isActive: boolean, familyId: string): Promise<Reward> {
    const reward = await Reward.findOne({ where: { id, familyId } });
    if (!reward) throw new AppError(404, 'Recompensa no encontrada');
    await reward.update({ isActive });
    return reward;
  },

  // ── List ───────────────────────────────────────────────────────────────────

  async getRewards(familyId: string, onlyActive = false): Promise<Reward[]> {
    const where: Record<string, unknown> = { familyId };
    if (onlyActive) where.isActive = true;
    return Reward.findAll({ where, order: [['createdAt', 'ASC']] });
  },

  // ── Child request flow ─────────────────────────────────────────────────────

  /** Reserves coins for a reward request (HU-26). Coins NOT deducted yet. */
  async requestReward(childId: number, rewardId: number): Promise<RewardRequest> {
    const reward = await Reward.findByPk(rewardId);
    if (!reward || !reward.isActive) throw new AppError(404, 'Recompensa no disponible');

    // Family isolation: child must be in the same family as the reward
    const child = await User.findByPk(childId);
    if (!child || child.familyId !== reward.familyId) {
      throw new AppError(403, 'Acceso denegado');
    }

    // No duplicate pending requests for the same reward
    const existing = await RewardRequest.findOne({
      where: { childId, rewardId, status: 'Pending' },
    });
    if (existing) throw new AppError(409, 'Ya tienes una solicitud pendiente para esta recompensa');

    // Effective balance = coins − sum of all pending reservations
    const profile = await ChildProfile.findOne({ where: { userId: childId } });
    if (!profile) throw new AppError(404, 'Perfil no encontrado');

    const pendingReserved = (await RewardRequest.sum('coinsReserved', {
      where: { childId, status: 'Pending' },
    })) ?? 0;

    if (profile.coins - pendingReserved < reward.coinCost) {
      throw new AppError(400, 'Saldo insuficiente para solicitar esta recompensa');
    }

    return RewardRequest.create({
      childId,
      rewardId,
      status: 'Pending',
      coinsReserved: reward.coinCost,
    });
  },

  // ── Admin request management ───────────────────────────────────────────────

  /** Deducts reserved coins, records RewardRedeemed Transaction. HU-27 */
  async approveRequest(requestId: number, adminFamilyId: string): Promise<RewardRequest> {
    const rr = await RewardRequest.findByPk(requestId, {
      include: [{ model: Reward, as: 'reward' }],
    });
    if (!rr) throw new AppError(404, 'Solicitud no encontrada');

    const reward = (rr as any).reward as Reward;
    if (reward.familyId !== adminFamilyId) throw new AppError(403, 'Acceso denegado');
    if (rr.status !== 'Pending') throw new AppError(400, 'Solo se pueden aprobar solicitudes pendientes');

    const profile = await ChildProfile.findOne({ where: { userId: rr.childId } });
    if (!profile) throw new AppError(404, 'Perfil no encontrado');

    // Deduct reserved coins (floor at 0 if penalty reduced balance in the interim)
    const deducted = Math.min(rr.coinsReserved, profile.coins);
    await profile.update({ coins: profile.coins - deducted });

    await Transaction.create({
      childId: rr.childId,
      rewardRequestId: rr.id,
      type: 'RewardRedeemed',
      coinsDelta: -deducted,
      xpDelta: 0,
      description: `Recompensa canjeada: ${reward.name}`,
    });

    await rr.update({ status: 'Approved' });
    return rr;
  },

  /** Returns reserved coins (just marks Rejected — coins were never deducted). HU-28 */
  async rejectRequest(
    requestId: number,
    adminFamilyId: string,
    reason?: string
  ): Promise<RewardRequest> {
    const rr = await RewardRequest.findByPk(requestId, {
      include: [{ model: Reward, as: 'reward' }],
    });
    if (!rr) throw new AppError(404, 'Solicitud no encontrada');

    const reward = (rr as any).reward as Reward;
    if (reward.familyId !== adminFamilyId) throw new AppError(403, 'Acceso denegado');
    if (rr.status !== 'Pending') throw new AppError(400, 'Solo se pueden rechazar solicitudes pendientes');

    // Coins are NOT modified — they were reserved but never deducted
    await rr.update({ status: 'Rejected', rejectionReason: reason ?? null });
    return rr;
  },

  async getRequests(
    query: { familyId: string; childId?: number; status?: string }
  ): Promise<RewardRequest[]> {
    // For admin: all requests in family; for child: own requests
    const where: Record<string, unknown> = {};
    if (query.childId) {
      where.childId = query.childId;
    } else {
      // Admin: filter by family via Reward
      const familyRewards = await Reward.findAll({
        where: { familyId: query.familyId },
        attributes: ['id'],
      });
      where.rewardId = familyRewards.map((r) => r.id);
    }
    if (query.status) where.status = query.status;

    return RewardRequest.findAll({
      where,
      include: [{ model: Reward, as: 'reward' }],
      order: [['createdAt', 'DESC']],
    });
  },
};
