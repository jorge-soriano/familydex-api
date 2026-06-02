import { Request, Response, NextFunction } from 'express';
import { taskTemplateService } from '../services/taskTemplate.service';

export const taskTemplateController = {

  // GET /api/task-templates
  async getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const onlyActive = req.query.active === 'true';
      const templates = await taskTemplateService.getTemplates(req.user!.familyId, onlyActive);
      res.json(templates);
    } catch (err) { next(err); }
  },

  // POST /api/task-templates
  async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, type, coinsReward, xpReward } = req.body;
      if (!title || !type) { res.status(400).json({ message: 'title y type son obligatorios' }); return; }
      const tpl = await taskTemplateService.createTemplate(req.body, req.user!.familyId);
      res.status(201).json(tpl);
    } catch (err) { next(err); }
  },

  // PUT /api/task-templates/:id
  async editTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tpl = await taskTemplateService.editTemplate(
        Number(req.params.id), req.body, req.user!.familyId
      );
      res.json(tpl);
    } catch (err) { next(err); }
  },

  // PATCH /api/task-templates/:id/status
  async toggleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isActive } = req.body as { isActive: boolean };
      if (typeof isActive !== 'boolean') { res.status(400).json({ message: 'isActive debe ser boolean' }); return; }
      const tpl = await taskTemplateService.setActive(Number(req.params.id), isActive, req.user!.familyId);
      res.json(tpl);
    } catch (err) { next(err); }
  },

  // POST /api/task-templates/:id/create-task
  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { childId, ...overrides } = req.body as { childId: number; [k: string]: unknown };
      if (!childId) { res.status(400).json({ message: 'childId es obligatorio' }); return; }
      const task = await taskTemplateService.createTaskFromTemplate(
        Number(req.params.id), Number(childId), req.user!.familyId, overrides as any
      );
      res.status(201).json(task);
    } catch (err) { next(err); }
  },

  // POST /api/task-templates/:id/quick-complete
  async quickComplete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { childId, ...overrides } = req.body as { childId: number; [k: string]: unknown };
      if (!childId) { res.status(400).json({ message: 'childId es obligatorio' }); return; }
      const result = await taskTemplateService.quickCompleteFromTemplate(
        Number(req.params.id), Number(childId), req.user!.familyId, overrides as any
      );
      res.status(201).json(result);
    } catch (err) { next(err); }
  },
};
