import { Request, Response, NextFunction } from 'express';
import { rewardService } from '../services/reward.service';

export const rewardController = {
  // GET /api/rewards
  async getRewards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const onlyActive = req.user!.role === 'child';
      const rewards = await rewardService.getRewards(req.user!.familyId, onlyActive);
      res.json(rewards);
    } catch (err) { next(err); }
  },

  // POST /api/rewards (admin) — HU-22
  async createReward(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, coinCost, isActive } = req.body;
      if (!name || !coinCost) { res.status(400).json({ message: 'Faltan campos obligatorios (name, coinCost)' }); return; }
      if (Number(coinCost) <= 0) { res.status(400).json({ message: 'El coste debe ser mayor que 0' }); return; }
      const reward = await rewardService.createReward(
        { name, description, coinCost: Number(coinCost), isActive },
        req.user!.familyId
      );
      res.status(201).json(reward);
    } catch (err) { next(err); }
  },

  // PUT /api/rewards/:id (admin) — HU-23
  async editReward(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reward = await rewardService.editReward(
        Number(req.params.id), req.body, req.user!.familyId
      );
      res.json(reward);
    } catch (err) { next(err); }
  },

  // PATCH /api/rewards/:id/status (admin) — HU-24
  async toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isActive } = req.body as { isActive: boolean };
      if (typeof isActive !== 'boolean') { res.status(400).json({ message: 'isActive debe ser boolean' }); return; }
      const reward = await rewardService.setActive(Number(req.params.id), isActive, req.user!.familyId);
      res.json(reward);
    } catch (err) { next(err); }
  },

  // GET /api/rewards/requests — admin: all family (or ?childId=X); child: own
  async getRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, childId: qChildId } = req.query as Record<string, string>;
      const childId = req.user!.role === 'child'
        ? req.user!.userId
        : (qChildId ? Number(qChildId) : undefined);
      const requests = await rewardService.getRequests({
        familyId: req.user!.familyId, childId, status,
      });
      res.json(requests);
    } catch (err) { next(err); }
  },

  // POST /api/rewards/requests (child) — HU-26
  async requestReward(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rewardId } = req.body as { rewardId: number };
      if (!rewardId) { res.status(400).json({ message: 'Falta rewardId' }); return; }
      const rr = await rewardService.requestReward(req.user!.userId, Number(rewardId));
      res.status(201).json(rr);
    } catch (err) { next(err); }
  },

  // POST /api/rewards/requests/:id/approve (admin) — HU-27
  async approveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rr = await rewardService.approveRequest(Number(req.params.id), req.user!.familyId);
      res.json(rr);
    } catch (err) { next(err); }
  },

  // POST /api/rewards/requests/:id/reject (admin) — HU-28
  async rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body as { reason?: string };
      const rr = await rewardService.rejectRequest(Number(req.params.id), req.user!.familyId, reason);
      res.json(rr);
    } catch (err) { next(err); }
  },
};
