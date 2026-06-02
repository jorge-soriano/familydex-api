import { Request, Response, NextFunction } from 'express';
import { economyService, HistoryFilters } from '../services/economy.service';
import type { TransactionType } from '../models/transaction.model';

export const economyController = {
  // GET /api/economy/balance
  // Child: own balance. Admin: ?childId=X
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const childUserId = req.user!.role === 'child'
        ? req.user!.userId
        : Number(req.query.childId);

      if (!childUserId || isNaN(childUserId)) {
        res.status(400).json({ message: 'Se requiere childId' }); return;
      }
      if (req.user!.role === 'admin') {
        await economyService.assertChildInFamily(childUserId, req.user!.familyId);
      }

      const balance = await economyService.getBalance(childUserId);
      res.json(balance);
    } catch (err) { next(err); }
  },

  // GET /api/economy/transactions
  // Child: own history (?type=). Admin: ?childId=X&type=&from=&to=
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, from, to, childId } = req.query as Record<string, string>;
      const filters: HistoryFilters = {
        type: type as TransactionType | undefined,
        from,
        to,
      };

      if (req.user!.role === 'child') {
        const history = await economyService.getHistory(req.user!.userId, filters);
        res.json(history);
        return;
      }

      // Admin: all family or specific child
      const history = await economyService.getFamilyHistory(req.user!.familyId, {
        ...filters,
        childId: childId ? Number(childId) : undefined,
      });
      res.json(history);
    } catch (err) { next(err); }
  },

  // POST /api/economy/penalty (admin only) — HU-13
  async applyPenalty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { childId, amount, reason } = req.body as {
        childId: number; amount: number; reason: string;
      };

      if (!childId || !amount || !reason) {
        res.status(400).json({ message: 'Faltan campos obligatorios (childId, amount, reason)' }); return;
      }
      if (Number(amount) <= 0) {
        res.status(400).json({ message: 'La cantidad debe ser mayor que 0' }); return;
      }

      await economyService.assertChildInFamily(Number(childId), req.user!.familyId);
      await economyService.applyPenalty(Number(childId), Number(amount), reason);
      res.status(200).json({ message: 'Penalización aplicada' });
    } catch (err) { next(err); }
  },
};
