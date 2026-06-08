import { Op } from 'sequelize';
import { Task, TaskStatus } from '../models/task.model';
import { TaskSeries, TaskType, TaskFrequency } from '../models/taskSeries.model';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/errorHandler.middleware';
import { activityService } from './activity.service';
export interface CreateTaskDto {
  assignedTo: number;
  title: string;
  description?: string;
  type: TaskType;
  coinsReward: number;
  xpReward: number;
  frequency: TaskFrequency | 'OneTime';
  daysOfWeek?: number[];
  dueDate?: string;
}

export interface EditTaskDto {
  title?: string;
  description?: string;
  type?: TaskType;
  coinsReward?: number;
  xpReward?: number;
  dueDate?: string | null;
  frequency?: TaskFrequency;
  daysOfWeek?: string; // JSON string, only used when updating TaskSeries
}

export interface GetTasksFilters {
  assignedTo?: number;
  status?: TaskStatus;
  type?: TaskType;
  onlyEnabled?: boolean; // true for child queries — hides disabled tasks
}

export const taskService = {
  async createTask(dto: CreateTaskDto, familyId: string): Promise<Task> {
    const child = await User.findOne({
      where: { id: dto.assignedTo, familyId, role: 'child', isActive: true },
    });
    if (!child) throw new AppError(404, 'Hijo no encontrado en esta familia');

    let seriesId: number | null = null;

    if (dto.frequency !== 'OneTime') {
      const series = await TaskSeries.create({
        familyId,
        assignedTo: dto.assignedTo,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        coinsReward: dto.coinsReward,
        xpReward: dto.xpReward,
        frequency: dto.frequency as TaskFrequency,
        daysOfWeek: dto.daysOfWeek ? JSON.stringify(dto.daysOfWeek) : null,
      });
      seriesId = series.id;
    }

    return Task.create({
      familyId,
      assignedTo: dto.assignedTo,
      seriesId,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      coinsReward: dto.coinsReward,
      xpReward: dto.xpReward,
      dueDate: dto.dueDate ?? null,
    });
  },

  async getTasks(filters: GetTasksFilters, familyId: string): Promise<Task[]> {
    const where: Record<string, unknown> = { familyId };
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.status)     where.status = filters.status;
    if (filters.type)       where.type = filters.type;
    if (filters.onlyEnabled) where.isEnabled = true;
    return Task.findAll({
      where,
      include: [{ model: TaskSeries, as: 'series', required: false }],
      order: [['createdAt', 'DESC']],
    });
  },

  async editTask(
    id: number,
    dto: EditTaskDto,
    familyId: string,
    applyToSeries = false
  ): Promise<Task> {
    const task = await Task.findOne({ where: { id, familyId } });
    if (!task) throw new AppError(404, 'Tarea no encontrada');

    if (applyToSeries && task.seriesId) {
      await TaskSeries.update(dto, { where: { id: task.seriesId } });
      // Update all pending instances of this series
      await Task.update(dto, {
        where: { seriesId: task.seriesId, status: { [Op.in]: ['Pending', 'Rejected'] } },
      });
    }
    await task.update(dto);
    return task.reload();
  },

  async deleteTask(
    id: number,
    familyId: string,
    deleteSeries = false
  ): Promise<void> {
    const task = await Task.findOne({ where: { id, familyId } });
    if (!task) throw new AppError(404, 'Tarea no encontrada');

    if (deleteSeries && task.seriesId) {
      await Task.destroy({
        where: {
          seriesId: task.seriesId,
          status: { [Op.in]: ['Pending', 'InReview', 'Rejected'] },
        },
      });
      await TaskSeries.destroy({ where: { id: task.seriesId } });
    } else {
      await task.destroy();
    }
  },

  async completeTask(id: number, childUserId: number, familyId: string): Promise<Task> {
    const task = await Task.findOne({ where: { id, familyId, assignedTo: childUserId } });
    if (!task) throw new AppError(404, 'Tarea no encontrada');
    if (task.status !== 'Pending') {
      throw new AppError(400, 'Solo se pueden completar tareas pendientes');
    }
    await task.update({ status: 'InReview' });
    return task;
  },

  async approveTask(id: number, familyId: string): Promise<Task> {
    const task = await Task.findOne({ where: { id, familyId } });
    if (!task) throw new AppError(404, 'Tarea no encontrada');
    if (task.status !== 'InReview') {
      throw new AppError(400, 'Solo se pueden aprobar tareas en revisión');
    }
    await task.update({ status: 'Approved' });
    await activityService.addCoinsAndXp(
      task.assignedTo,
      task.coinsReward,
      task.xpReward,
      `Tarea aprobada: ${task.title}`,
      task.id
    );
    return task;
  },

  async rejectTask(
    id: number,
    reason: string | null,
    familyId: string
  ): Promise<Task> {
    const task = await Task.findOne({ where: { id, familyId } });
    if (!task) throw new AppError(404, 'Tarea no encontrada');
    if (task.status !== 'InReview') {
      throw new AppError(400, 'Solo se pueden rechazar tareas en revisión');
    }
    await task.update({ status: 'Pending', rejectionReason: reason ?? null });
    return task;
  },

  /** Called by node-cron every midnight to generate daily/weekly instances. */

  /**
   * Admin approves a task regardless of its current status (Pending or InReview).
   * Useful when the parent wants to confirm a task without waiting for the child.
   */
  async directApprove(id: number, familyId: string): Promise<Task> {
    const task = await Task.findOne({ where: { id, familyId } });
    if (!task) throw new AppError(404, 'Tarea no encontrada');
    if (task.status === 'Approved') throw new AppError(400, 'La tarea ya está aprobada');

    await task.update({ status: 'Approved' });
    await activityService.addCoinsAndXp(
      task.assignedTo,
      task.coinsReward,
      task.xpReward,
      `Tarea aprobada: ${task.title}`,
      task.id
    );
    return task;
  },

  /**
   * Toggles isEnabled on a task.
   * For recurring tasks: also toggles TaskSeries.isActive and all pending instances.
   * Disabled tasks are hidden from the child's task list.
   */
  async toggleEnabled(id: number, familyId: string): Promise<{ isEnabled: boolean }> {
    const task = await Task.findOne({ where: { id, familyId } });
    if (!task) throw new AppError(404, 'Tarea no encontrada');

    const newEnabled = !task.isEnabled;

    if (task.seriesId) {
      // Recurring: affect the entire series + all pending instances
      await TaskSeries.update({ isActive: newEnabled }, { where: { id: task.seriesId } });
      await Task.update(
        { isEnabled: newEnabled },
        { where: { seriesId: task.seriesId, status: { [Op.in]: ['Pending', 'InReview'] } } }
      );
    } else {
      await task.update({ isEnabled: newEnabled });
    }
    return { isEnabled: newEnabled };
  },

  async generateRecurringTasks(): Promise<number> {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const activeSeries = await TaskSeries.findAll({ where: { isActive: true } });
    let created = 0;

    for (const series of activeSeries) {
      if (series.frequency === 'Weekly') {
        const days: number[] = JSON.parse(series.daysOfWeek || '[]');
        if (!days.includes(dayOfWeek)) continue;
      }

      // No crear nueva instancia si ya hay una Pending (el niño aún no la ha hecho).
      // Sí crear si está InReview (el niño cumplió, el padre aún no ha revisado),
      // Approved o Rejected (resuelta, toca una nueva).
      const pendingExists = await Task.findOne({
        where: { seriesId: series.id, status: 'Pending' },
      });
      if (pendingExists) continue;

      await Task.create({
        familyId: series.familyId,
        assignedTo: series.assignedTo,
        seriesId: series.id,
        title: series.title,
        description: series.description,
        type: series.type,
        coinsReward: series.coinsReward,
        xpReward: series.xpReward,
      });
      created++;
    }

    return created;
  },

};
