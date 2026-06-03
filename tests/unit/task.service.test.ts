import { taskService } from '../../src/services/task.service';
import { Task } from '../../src/models/task.model';
import { TaskSeries } from '../../src/models/taskSeries.model';
import { User } from '../../src/models/user.model';
import { economyService } from '../../src/services/economy.service';
import { AppError } from '../../src/middlewares/errorHandler.middleware';

jest.mock('../../src/models/task.model', () => ({
  Task: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn(), destroy: jest.fn(), update: jest.fn() },
}));
jest.mock('../../src/models/taskSeries.model', () => ({
  TaskSeries: { create: jest.fn(), findAll: jest.fn(), destroy: jest.fn(), update: jest.fn() },
}));
jest.mock('../../src/models/user.model', () => ({
  User: { findOne: jest.fn() },
}));
jest.mock('../../src/services/economy.service', () => ({
  economyService: { addCoinsAndXp: jest.fn() },
}));

const MockTask       = Task       as unknown as { findOne: jest.Mock; findAll: jest.Mock; create: jest.Mock; destroy: jest.Mock; update: jest.Mock };
const MockTaskSeries = TaskSeries as unknown as { create: jest.Mock; findAll: jest.Mock; destroy: jest.Mock; update: jest.Mock };
const MockUser       = User       as unknown as { findOne: jest.Mock };
const MockEconomy    = economyService as unknown as { addCoinsAndXp: jest.Mock };

const FAMILY = 'family-uuid';

const makeTask = (overrides = {}) => ({
  id: 1, familyId: FAMILY, assignedTo: 2, seriesId: null,
  title: 'Test', type: 'hogar', coinsReward: 10, xpReward: 20,
  status: 'Pending', rejectionReason: null, dueDate: null,
  update: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn().mockReturnThis(),
  destroy: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('taskService.createTask', () => {
  it('creates a one-time task with Pending status', async () => {
    MockUser.findOne.mockResolvedValue({ id: 2 });
    MockTask.create.mockResolvedValue(makeTask());

    const task = await taskService.createTask(
      { assignedTo: 2, title: 'Test', type: 'hogar', coinsReward: 10, xpReward: 20, frequency: 'OneTime' },
      FAMILY
    );

    expect(MockTask.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test', type: 'hogar', familyId: FAMILY })
    );
    expect(task).toBeDefined();
  });

  it('creates TaskSeries when frequency is Daily', async () => {
    MockUser.findOne.mockResolvedValue({ id: 2 });
    MockTaskSeries.create.mockResolvedValue({ id: 5 });
    MockTask.create.mockResolvedValue(makeTask({ seriesId: 5 }));

    await taskService.createTask(
      { assignedTo: 2, title: 'Daily', type: 'deberes', coinsReward: 5, xpReward: 10, frequency: 'Daily' },
      FAMILY
    );

    expect(MockTaskSeries.create).toHaveBeenCalled();
    expect(MockTask.create).toHaveBeenCalledWith(expect.objectContaining({ seriesId: 5 }));
  });

  it('throws 404 when assigned child not found in family', async () => {
    MockUser.findOne.mockResolvedValue(null);
    await expect(
      taskService.createTask(
        { assignedTo: 99, title: 'T', type: 'hogar', coinsReward: 0, xpReward: 0, frequency: 'OneTime' },
        FAMILY
      )
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('taskService.completeTask', () => {
  it('moves task from Pending to InReview', async () => {
    const task = makeTask({ status: 'Pending' });
    MockTask.findOne.mockResolvedValue(task);

    await taskService.completeTask(1, 2, FAMILY);
    expect(task.update).toHaveBeenCalledWith({ status: 'InReview' });
  });

  it('throws 400 when task is not Pending', async () => {
    MockTask.findOne.mockResolvedValue(makeTask({ status: 'InReview' }));
    await expect(taskService.completeTask(1, 2, FAMILY)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 when task not found or not assigned to child', async () => {
    MockTask.findOne.mockResolvedValue(null);
    await expect(taskService.completeTask(1, 2, FAMILY)).rejects.toMatchObject({ status: 404 });
  });
});

describe('taskService.approveTask', () => {
  it('moves task to Approved and calls economyService.addCoinsAndXp', async () => {
    const task = makeTask({ status: 'InReview', coinsReward: 10, xpReward: 20, assignedTo: 2 });
    MockTask.findOne.mockResolvedValue(task);
    MockEconomy.addCoinsAndXp.mockResolvedValue(undefined);

    await taskService.approveTask(1, FAMILY);

    expect(task.update).toHaveBeenCalledWith({ status: 'Approved' });
    expect(MockEconomy.addCoinsAndXp).toHaveBeenCalledWith(2, 10, 20, expect.any(String), 1);
  });

  it('throws 400 when task is not InReview', async () => {
    MockTask.findOne.mockResolvedValue(makeTask({ status: 'Pending' }));
    await expect(taskService.approveTask(1, FAMILY)).rejects.toMatchObject({ status: 400 });
  });
});

describe('taskService.rejectTask', () => {
  it('moves task back to Pending with rejection reason', async () => {
    const task = makeTask({ status: 'InReview' });
    MockTask.findOne.mockResolvedValue(task);

    await taskService.rejectTask(1, 'No está bien hecha', FAMILY);

    expect(task.update).toHaveBeenCalledWith({
      status: 'Pending',
      rejectionReason: 'No está bien hecha',
    });
  });

  it('throws 400 when task is not InReview', async () => {
    MockTask.findOne.mockResolvedValue(makeTask({ status: 'Approved' }));
    await expect(taskService.rejectTask(1, null, FAMILY)).rejects.toBeInstanceOf(AppError);
  });
});

describe('taskService.deleteTask', () => {
  it('deletes a single non-approved task', async () => {
    const task = makeTask({ status: 'Pending' });
    MockTask.findOne.mockResolvedValue(task);

    await taskService.deleteTask(1, FAMILY);
    expect(task.destroy).toHaveBeenCalled();
  });

  it('admin can delete any task including Approved ones', async () => {
    MockTask.findOne.mockResolvedValue(makeTask({ status: 'Approved' }));
    const task = makeTask({ status: 'Approved' });
    MockTask.findOne.mockResolvedValue(task);
    await expect(taskService.deleteTask(1, FAMILY)).resolves.toBeUndefined();
  });
});

// ── createCompletedTaskByAdmin ────────────────────────────────────────────────
describe('taskService.createCompletedTaskByAdmin', () => {
  it('creates Task with Approved status and calls economyService', async () => {
    MockUser.findOne.mockResolvedValue({ id: 2, familyId: FAMILY, role: 'child', isActive: true });
    MockTask.create.mockResolvedValue({
      id: 10, status: 'Approved', coinsReward: 20, xpReward: 100, title: 'Notable en mates', assignedTo: 2,
    });
    MockEconomy.addCoinsAndXp.mockResolvedValue({});

    const { task } = await taskService.createCompletedTaskByAdmin(
      { childId: 2, title: 'Notable en mates', type: 'deberes', coinsReward: 20, xpReward: 100 },
      FAMILY
    );

    expect(MockTask.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Approved', assignedTo: 2 })
    );
    expect(MockEconomy.addCoinsAndXp).toHaveBeenCalledWith(2, 20, 100, expect.any(String), 10);
    expect(task.status).toBe('Approved');
  });

  it('throws 404 when child not found in family', async () => {
    MockUser.findOne.mockResolvedValue(null);
    await expect(
      taskService.createCompletedTaskByAdmin(
        { childId: 99, title: 'T', type: 'hogar', coinsReward: 0, xpReward: 0 },
        FAMILY
      )
    ).rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 when rewards are negative', async () => {
    await expect(
      taskService.createCompletedTaskByAdmin(
        { childId: 2, title: 'T', type: 'hogar', coinsReward: -1, xpReward: 0 },
        FAMILY
      )
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ── multi-asignación (vía controller, no service) ─────────────────────────────
// El servicio createTask sigue aceptando un solo childId.
// El controller gestiona el array y llama createTask N veces.
// Aquí verificamos que el servicio sigue funcionando para un hijo.
describe('taskService.createTask (single — multi-assign is handled in controller)', () => {
  it('still works correctly for a single child', async () => {
    MockUser.findOne.mockResolvedValue({ id: 3 });
    MockTask.create.mockResolvedValue({ id: 20, status: 'Pending' });

    const task = await taskService.createTask(
      { assignedTo: 3, title: 'Poner la mesa', type: 'hogar', coinsReward: 5, xpReward: 25, frequency: 'OneTime' },
      FAMILY
    );
    expect(task).toBeDefined();
    expect(MockTask.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: 3, familyId: FAMILY })
    );
  });
});

// ── directApprove ─────────────────────────────────────────────────────────────
describe('taskService.directApprove', () => {
  it('approves a Pending task and calls economyService', async () => {
    const task = makeTask({ status: 'Pending', coinsReward: 10, xpReward: 50, assignedTo: 2 });
    MockTask.findOne.mockResolvedValue(task);
    MockEconomy.addCoinsAndXp.mockResolvedValue({});

    await taskService.directApprove(1, FAMILY);
    expect(task.update).toHaveBeenCalledWith({ status: 'Approved' });
    expect(MockEconomy.addCoinsAndXp).toHaveBeenCalledWith(2, 10, 50, expect.any(String), 1);
  });

  it('also approves InReview tasks', async () => {
    const task = makeTask({ status: 'InReview', assignedTo: 2 });
    MockTask.findOne.mockResolvedValue(task);
    MockEconomy.addCoinsAndXp.mockResolvedValue({});

    await taskService.directApprove(1, FAMILY);
    expect(task.update).toHaveBeenCalledWith({ status: 'Approved' });
  });

  it('throws 400 when already Approved', async () => {
    MockTask.findOne.mockResolvedValue(makeTask({ status: 'Approved' }));
    await expect(taskService.directApprove(1, FAMILY)).rejects.toMatchObject({ status: 400 });
  });
});

// ── toggleEnabled ─────────────────────────────────────────────────────────────
describe('taskService.toggleEnabled', () => {
  it('disables an enabled task', async () => {
    const task = makeTask({ isEnabled: true, seriesId: null });
    MockTask.findOne.mockResolvedValue(task);

    const result = await taskService.toggleEnabled(1, FAMILY);
    expect(task.update).toHaveBeenCalledWith({ isEnabled: false });
    expect(result.isEnabled).toBe(false);
  });

  it('re-enables a disabled task', async () => {
    const task = makeTask({ isEnabled: false, seriesId: null });
    MockTask.findOne.mockResolvedValue(task);

    const result = await taskService.toggleEnabled(1, FAMILY);
    expect(task.update).toHaveBeenCalledWith({ isEnabled: true });
    expect(result.isEnabled).toBe(true);
  });

  it('for recurring tasks toggles the series and all pending instances', async () => {
    const task = makeTask({ isEnabled: true, seriesId: 5 });
    MockTask.findOne.mockResolvedValue(task);
    MockTaskSeries.update.mockResolvedValue([1]);
    MockTask.update.mockResolvedValue([2]);

    await taskService.toggleEnabled(1, FAMILY);
    expect(MockTaskSeries.update).toHaveBeenCalledWith(
      { isActive: false }, expect.objectContaining({ where: { id: 5 } })
    );
    expect(MockTask.update).toHaveBeenCalledWith(
      { isEnabled: false }, expect.objectContaining({ where: expect.objectContaining({ seriesId: 5 }) })
    );
  });
});
