import { taskTemplateService } from '../../src/services/taskTemplate.service';
import { TaskTemplate } from '../../src/models/taskTemplate.model';
import { AppError } from '../../src/middlewares/errorHandler.middleware';

jest.mock('../../src/models/taskTemplate.model', () => ({
  TaskTemplate: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
}));
jest.mock('../../src/services/task.service', () => ({
  taskService: { createTask: jest.fn(), createCompletedTaskByAdmin: jest.fn() },
}));

const MockTpl = TaskTemplate as unknown as { findOne: jest.Mock; findAll: jest.Mock; create: jest.Mock };

import { taskService } from '../../src/services/task.service';
const MockTaskService = taskService as unknown as {
  createTask: jest.Mock;
  createCompletedTaskByAdmin: jest.Mock;
};

const FAMILY = 'family-uuid';

const makeTpl = (overrides = {}) => ({
  id: 1, familyId: FAMILY, title: 'Hacer la cama', type: 'hogar',
  coinsReward: 10, xpReward: 50, isActive: true,
  description: null, category: null, sortOrder: null,
  update: jest.fn().mockImplementation(function(this: any, v: any) { Object.assign(this, v); return Promise.resolve(this); }),
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('taskTemplateService.createTemplate', () => {
  it('creates a template and returns it', async () => {
    const tpl = makeTpl();
    MockTpl.create.mockResolvedValue(tpl);

    const result = await taskTemplateService.createTemplate(
      { title: 'Hacer la cama', type: 'hogar', coinsReward: 10, xpReward: 50 },
      FAMILY
    );
    expect(result.title).toBe('Hacer la cama');
    expect(MockTpl.create).toHaveBeenCalledWith(expect.objectContaining({ familyId: FAMILY }));
  });
});

describe('taskTemplateService.editTemplate', () => {
  it('edits an existing template', async () => {
    const tpl = makeTpl();
    MockTpl.findOne.mockResolvedValue(tpl);

    const result = await taskTemplateService.editTemplate(1, { title: 'Nuevo título' }, FAMILY);
    expect(tpl.update).toHaveBeenCalledWith({ title: 'Nuevo título' });
  });

  it('throws 404 when template not found', async () => {
    MockTpl.findOne.mockResolvedValue(null);
    await expect(taskTemplateService.editTemplate(99, {}, FAMILY)).rejects.toMatchObject({ status: 404 });
  });
});

describe('taskTemplateService.setActive', () => {
  it('deactivates a template', async () => {
    const tpl = makeTpl({ isActive: true });
    MockTpl.findOne.mockResolvedValue(tpl);

    await taskTemplateService.setActive(1, false, FAMILY);
    expect(tpl.update).toHaveBeenCalledWith({ isActive: false });
  });
});

describe('taskTemplateService.getTemplates', () => {
  it('returns only templates of the family', async () => {
    MockTpl.findAll.mockResolvedValue([makeTpl()]);

    const results = await taskTemplateService.getTemplates(FAMILY);
    expect(MockTpl.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ familyId: FAMILY }) })
    );
    expect(results).toHaveLength(1);
  });

  it('filters by isActive when onlyActive=true', async () => {
    MockTpl.findAll.mockResolvedValue([]);
    await taskTemplateService.getTemplates(FAMILY, true);
    expect(MockTpl.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) })
    );
  });
});

describe('taskTemplateService.createTaskFromTemplate', () => {
  it('creates Task with template data + overrides', async () => {
    MockTpl.findOne.mockResolvedValue(makeTpl());
    MockTaskService.createTask.mockResolvedValue({ id: 5, status: 'Pending' });

    await taskTemplateService.createTaskFromTemplate(1, 2, FAMILY, { coinsReward: 20 });

    expect(MockTaskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: 2, coinsReward: 20, xpReward: 50 }),
      FAMILY
    );
  });

  it('throws 400 when template is inactive', async () => {
    MockTpl.findOne.mockResolvedValue(makeTpl({ isActive: false }));
    await expect(
      taskTemplateService.createTaskFromTemplate(1, 2, FAMILY)
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('taskTemplateService.quickCompleteFromTemplate', () => {
  it('calls createCompletedTaskByAdmin with template data', async () => {
    MockTpl.findOne.mockResolvedValue(makeTpl());
    MockTaskService.createCompletedTaskByAdmin.mockResolvedValue({ task: { id: 7 } });

    await taskTemplateService.quickCompleteFromTemplate(1, 2, FAMILY);

    expect(MockTaskService.createCompletedTaskByAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ childId: 2, title: 'Hacer la cama', coinsReward: 10 }),
      FAMILY
    );
  });
});
