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

  // POST /api/economy/direct-record (admin) — unified reward/penalty for one or more children
  async directRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { childIds, coinsDelta, xp, reason } = req.body as {
        childIds: number | number[]; coinsDelta: number; xp: number; reason: string;
      };

      const ids = Array.isArray(childIds) ? childIds : [childIds];
      if (!ids.length || !reason) {
        res.status(400).json({ message: 'childIds y reason son obligatorios' }); return;
      }
      if (xp < 0) {
        res.status(400).json({ message: 'XP no puede ser negativa' }); return;
      }
      if (coinsDelta === 0 && xp === 0) {
        res.status(400).json({ message: 'Al menos monedas o XP deben ser distintos de 0' }); return;
      }

      for (const childId of ids) {
        await economyService.assertChildInFamily(Number(childId), req.user!.familyId);
      }
      await economyService.applyDirectRecord(ids.map(Number), Number(coinsDelta), Number(xp), reason);
      res.status(200).json({ message: 'Registro aplicado' });
    } catch (err) { next(err); }
  },

};
