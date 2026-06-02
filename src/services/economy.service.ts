import { ChildProfile } from '../models/childProfile.model';
import { Transaction } from '../models/transaction.model';
import { AppError } from '../middlewares/errorHandler.middleware';

// pokemonService.addXpToActive will be wired here in Épica 4
export const economyService = {
  /**
   * Awards coins and XP to a child. Coins/XP are added to ChildProfile
   * and recorded as a Transaction. XP is always additive (never decreases).
   */
  async addCoinsAndXp(
    childUserId: number,
    coins: number,
    xp: number,
    description: string,
    taskId?: number
  ): Promise<void> {
    const profile = await ChildProfile.findOne({ where: { userId: childUserId } });
    if (!profile) throw new AppError(404, 'Perfil de hijo no encontrado');

    await profile.update({
      coins: profile.coins + coins,
      xp: profile.xp + xp,
    });

    await Transaction.create({
      childId: childUserId,
      taskId: taskId ?? null,
      type: 'TaskReward',
      coinsDelta: coins,
      xpDelta: xp,
      description,
    });

    // TODO Épica 4: await pokemonService.addXpToActive(childUserId, xp);
  },

  /**
   * Deducts coins from a child (minimum 0). XP is never affected by penalties.
   * Implemented fully in Épica 3.
   */
  async applyPenalty(
    childUserId: number,
    amount: number,
    reason: string
  ): Promise<void> {
    const profile = await ChildProfile.findOne({ where: { userId: childUserId } });
    if (!profile) throw new AppError(404, 'Perfil de hijo no encontrado');

    const deducted = Math.min(amount, profile.coins);
    await profile.update({ coins: profile.coins - deducted });

    await Transaction.create({
      childId: childUserId,
      type: 'Penalty',
      coinsDelta: -deducted,
      xpDelta: 0,
      description: reason,
    });
  },
};
