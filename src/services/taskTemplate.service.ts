import { TaskTemplate } from '../models/taskTemplate.model';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/errorHandler.middleware';
import { taskService, CreateTaskDto } from './task.service';
import type { TaskType } from '../models/taskSeries.model';
import type { EvoResult } from './pokemon.service';
import type { Task } from '../models/task.model';

export interface CreateTemplateDto {
  title: string;
  description?: string;
  type: TaskType;
  coinsReward: number;
  xpReward: number;
  category?: string;
  sortOrder?: number;
}

export interface EditTemplateDto {
  title?: string;
  description?: string;
  type?: TaskType;
  coinsReward?: number;
  xpReward?: number;
  category?: string;
  sortOrder?: number;
}

export interface TaskFromTemplateOverrides {
  coinsReward?: number;
  xpReward?: number;
  description?: string;
  dueDate?: string;
  frequency?: 'OneTime' | 'Daily' | 'Weekly';
  daysOfWeek?: number[];
}

export const taskTemplateService = {

  async createTemplate(dto: CreateTemplateDto, familyId: string): Promise<TaskTemplate> {
    return TaskTemplate.create({
      familyId,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      coinsReward: dto.coinsReward ?? 0,
      xpReward: dto.xpReward ?? 0,
      category: dto.category ?? null,
      sortOrder: dto.sortOrder ?? null,
    });
  },

  async editTemplate(id: number, dto: EditTemplateDto, familyId: string): Promise<TaskTemplate> {
    const tpl = await TaskTemplate.findOne({ where: { id, familyId } });
    if (!tpl) throw new AppError(404, 'Plantilla no encontrada');
    await tpl.update(dto);
    return tpl;
  },

  async setActive(id: number, isActive: boolean, familyId: string): Promise<TaskTemplate> {
    const tpl = await TaskTemplate.findOne({ where: { id, familyId } });
    if (!tpl) throw new AppError(404, 'Plantilla no encontrada');
    await tpl.update({ isActive });
    return tpl;
  },

  async getTemplates(familyId: string, onlyActive = false, isRecordPreset?: boolean): Promise<TaskTemplate[]> {
    const where: Record<string, unknown> = { familyId };
    if (onlyActive) where.isActive = true;
    if (isRecordPreset !== undefined) where.isRecordPreset = isRecordPreset;
    return TaskTemplate.findAll({ where, order: [['sortOrder', 'ASC NULLS LAST'], ['createdAt', 'ASC']] });
  },

  /**
   * Creates a Task (Pending) from a template for a specific child.
   * Template data can be overridden per-assignment.
   */
  async createTaskFromTemplate(
    templateId: number,
    childId: number,
    familyId: string,
    overrides: TaskFromTemplateOverrides = {}
  ): Promise<Task> {
    const tpl = await TaskTemplate.findOne({ where: { id: templateId, familyId } });
    if (!tpl) throw new AppError(404, 'Plantilla no encontrada');
    if (!tpl.isActive) throw new AppError(400, 'La plantilla está desactivada');

    const dto: CreateTaskDto = {
      assignedTo: childId,
      title: tpl.title,
      description: overrides.description ?? tpl.description ?? undefined,
      type: tpl.type,
      coinsReward: overrides.coinsReward ?? tpl.coinsReward,
      xpReward: overrides.xpReward ?? tpl.xpReward,
      frequency: overrides.frequency ?? 'OneTime',
      daysOfWeek: overrides.daysOfWeek,
      dueDate: overrides.dueDate,
    };

    return taskService.createTask(dto, familyId);
  },

  /**
   * Registers a directly-approved achievement from a template
   * (parent marks it as already completed by the child).
   */
  async quickCompleteFromTemplate(
    templateId: number,
    childId: number,
    familyId: string,
    overrides: Pick<TaskFromTemplateOverrides, 'coinsReward' | 'xpReward' | 'description'> = {}
  ): Promise<{ task: Task; evolutionResult?: EvoResult }> {
    const tpl = await TaskTemplate.findOne({ where: { id: templateId, familyId } });
    if (!tpl) throw new AppError(404, 'Plantilla no encontrada');
    if (!tpl.isActive) throw new AppError(400, 'La plantilla está desactivada');

    return taskService.createCompletedTaskByAdmin(
      {
        childId,
        title: tpl.title,
        description: overrides.description ?? tpl.description ?? undefined,
        type: tpl.type,
        coinsReward: overrides.coinsReward ?? tpl.coinsReward,
        xpReward: overrides.xpReward ?? tpl.xpReward,
      },
      familyId
    );
  },

  async assertFamilyOwnership(templateId: number, familyId: string): Promise<TaskTemplate> {
    const tpl = await TaskTemplate.findOne({ where: { id: templateId, familyId } });
    if (!tpl) throw new AppError(404, 'Plantilla no encontrada');
    return tpl;
  },
};
