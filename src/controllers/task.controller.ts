import { Request, Response, NextFunction } from 'express';
import { taskService, CreateTaskDto, EditTaskDto, CreateCompletedTaskDto } from '../services/task.service';
import type { TaskStatus, TaskType } from '../models/task.model';

export const taskController = {
  // GET /api/tasks — admin sees full family, child sees own tasks
  async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignedTo, status, type } = req.query as Record<string, string>;
      const filters = {
        assignedTo: req.user!.role === 'child'
          ? req.user!.userId
          : (assignedTo ? Number(assignedTo) : undefined),
        status: status as TaskStatus | undefined,
        type: type as TaskType | undefined,
      };
      const tasks = await taskService.getTasks(filters, req.user!.familyId);
      res.json(tasks);
    } catch (err) { next(err); }
  },

  // POST /api/tasks (admin) — assignedTo acepta number o number[] para multi-asignación
  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as CreateTaskDto & { assignedTo: number | number[] };
      if (!body.title || !body.type || !body.assignedTo || body.frequency === undefined) {
        res.status(400).json({ message: 'Faltan campos obligatorios' }); return;
      }
      if ((body.coinsReward ?? 0) < 0 || (body.xpReward ?? 0) < 0) {
        res.status(400).json({ message: 'Las recompensas no pueden ser negativas' }); return;
      }

      const childIds = Array.isArray(body.assignedTo) ? body.assignedTo : [body.assignedTo];
      const tasks = await Promise.all(
        childIds.map((id) => taskService.createTask({ ...body, assignedTo: id }, req.user!.familyId))
      );
      // Single child → return object for backward compat; multiple → return array
      res.status(201).json(tasks.length === 1 ? tasks[0] : tasks);
    } catch (err) { next(err); }
  },

  // PUT /api/tasks/:id (admin)
  async editTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { applyToSeries } = req.query;
      const dto = req.body as EditTaskDto;
      const task = await taskService.editTask(
        Number(req.params.id), dto, req.user!.familyId,
        applyToSeries === 'true'
      );
      res.json(task);
    } catch (err) { next(err); }
  },

  // DELETE /api/tasks/:id (admin)
  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deleteSeries } = req.query;
      await taskService.deleteTask(
        Number(req.params.id), req.user!.familyId,
        deleteSeries === 'true'
      );
      res.status(204).send();
    } catch (err) { next(err); }
  },

  // POST /api/tasks/:id/complete (child)
  async completeTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.completeTask(
        Number(req.params.id), req.user!.userId, req.user!.familyId
      );
      res.json(task);
    } catch (err) { next(err); }
  },

  // POST /api/tasks/:id/approve (admin)
  async approveTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.approveTask(Number(req.params.id), req.user!.familyId);
      res.json(task);
    } catch (err) { next(err); }
  },

  // POST /api/tasks/:id/reject (admin)
  async rejectTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body as { reason?: string };
      const task = await taskService.rejectTask(
        Number(req.params.id), reason ?? null, req.user!.familyId
      );
      res.json(task);
    } catch (err) { next(err); }
  },

  // POST /api/tasks/quick-complete (admin) — registers already-completed achievement
  async quickComplete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreateCompletedTaskDto;
      if (!dto.childId || !dto.title || !dto.type) {
        res.status(400).json({ message: 'childId, title y type son obligatorios' }); return;
      }
      if ((dto.coinsReward ?? 0) < 0 || (dto.xpReward ?? 0) < 0) {
        res.status(400).json({ message: 'Las recompensas no pueden ser negativas' }); return;
      }
      const result = await taskService.createCompletedTaskByAdmin(dto, req.user!.familyId);
      res.status(201).json(result);
    } catch (err) { next(err); }
  },
};
