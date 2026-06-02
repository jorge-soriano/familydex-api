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

  it('throws 400 when trying to delete an Approved task', async () => {
    MockTask.findOne.mockResolvedValue(makeTask({ status: 'Approved' }));
    await expect(taskService.deleteTask(1, FAMILY)).rejects.toMatchObject({ status: 400 });
  });
});
