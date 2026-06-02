import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';

export const adminController = {
  // GET /api/admin/dashboard — HU-29
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getDashboard(req.user!.familyId);
      res.json(data);
    } catch (err) { next(err); }
  },

  // GET /api/admin/children — HU-30
  async getChildren(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const children = await adminService.getChildren(req.user!.familyId);
      res.json(children);
    } catch (err) { next(err); }
  },

  // GET /api/admin/children/:id — used by ChildDetail page
  async getChild(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const child = await adminService.getChildSummary(
        Number(req.params.id), req.user!.familyId
      );
      res.json(child);
    } catch (err) { next(err); }
  },

  // PUT /api/admin/children/:id — edit displayName / password — HU-30
  async updateChild(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { displayName, password } = req.body as { displayName?: string; password?: string };
      if (!displayName && !password) {
        res.status(400).json({ message: 'Proporciona al menos displayName o password' }); return;
      }
      await adminService.updateChild(Number(req.params.id), { displayName, password }, req.user!.familyId);
      res.status(200).json({ message: 'Actualizado' });
    } catch (err) { next(err); }
  },

  // PATCH /api/admin/children/:id/status — HU-30
  async toggleChildStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isActive } = req.body as { isActive: boolean };
      if (typeof isActive !== 'boolean') {
        res.status(400).json({ message: 'isActive debe ser boolean' }); return;
      }
      await adminService.toggleChildStatus(Number(req.params.id), isActive, req.user!.familyId);
      res.status(200).json({ message: isActive ? 'Cuenta activada' : 'Cuenta desactivada' });
    } catch (err) { next(err); }
  },

  // GET /api/admin/notifications — HU-32
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const counts = await adminService.getNotifications(req.user!.familyId);
      res.json(counts);
    } catch (err) { next(err); }
  },
};
