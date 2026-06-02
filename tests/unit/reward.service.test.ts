import { rewardService } from '../../src/services/reward.service';
import { Reward } from '../../src/models/reward.model';
import { RewardRequest } from '../../src/models/rewardRequest.model';
import { ChildProfile } from '../../src/models/childProfile.model';
import { Transaction } from '../../src/models/transaction.model';
import { User } from '../../src/models/user.model';
import { AppError } from '../../src/middlewares/errorHandler.middleware';

jest.mock('../../src/models/reward.model', () => ({
  Reward: { findByPk: jest.fn(), findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
}));
jest.mock('../../src/models/rewardRequest.model', () => ({
  RewardRequest: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn(), findByPk: jest.fn(), sum: jest.fn() },
}));
jest.mock('../../src/models/childProfile.model', () => ({
  ChildProfile: { findOne: jest.fn() },
}));
jest.mock('../../src/models/transaction.model', () => ({
  Transaction: { create: jest.fn() },
}));
jest.mock('../../src/models/user.model', () => ({
  User: { findByPk: jest.fn() },
}));

const MockReward   = Reward         as unknown as { findByPk:jest.Mock; findOne:jest.Mock; findAll:jest.Mock; create:jest.Mock };
const MockRR       = RewardRequest  as unknown as { findOne:jest.Mock; findAll:jest.Mock; create:jest.Mock; findByPk:jest.Mock; sum:jest.Mock };
const MockProfile  = ChildProfile   as unknown as { findOne:jest.Mock };
const MockTx       = Transaction    as unknown as { create:jest.Mock };
const MockUser     = User           as unknown as { findByPk:jest.Mock };

const FAMILY = 'family-uuid';

const makeRR = (overrides = {}) => ({
  id: 10, childId: 2, rewardId: 5, status: 'Pending',
  coinsReserved: 30, rejectionReason: null,
  update: jest.fn().mockImplementation(function(this: any, v: any) { Object.assign(this, v); return Promise.resolve(this); }),
  reward: { id: 5, name: 'Pantalla 30 min', familyId: FAMILY, coinCost: 30 },
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

// ── requestReward (HU-26) ─────────────────────────────────────────────────────
describe('rewardService.requestReward', () => {
  it('creates RewardRequest without deducting coins from ChildProfile', async () => {
    MockReward.findByPk.mockResolvedValue({ id: 5, isActive: true, coinCost: 30, familyId: FAMILY, name: 'X' });
    MockUser.findByPk.mockResolvedValue({ id: 2, familyId: FAMILY });
    MockRR.findOne.mockResolvedValue(null);           // no duplicate
    MockProfile.findOne.mockResolvedValue({ userId: 2, coins: 100, xp: 0 });
    MockRR.sum.mockResolvedValue(0);                  // no pending reservations
    MockRR.create.mockResolvedValue({ id: 10 });

    await rewardService.requestReward(2, 5);

    // Coins must NOT be modified
    expect(MockProfile.findOne).toHaveBeenCalled();
    expect(MockRR.create).toHaveBeenCalledWith(
      expect.objectContaining({ childId: 2, rewardId: 5, coinsReserved: 30, status: 'Pending' })
    );
    // profile.update should NOT be called
  });

  it('throws 400 when effective balance is insufficient', async () => {
    MockReward.findByPk.mockResolvedValue({ id: 5, isActive: true, coinCost: 30, familyId: FAMILY });
    MockUser.findByPk.mockResolvedValue({ id: 2, familyId: FAMILY });
    MockRR.findOne.mockResolvedValue(null);
    MockProfile.findOne.mockResolvedValue({ userId: 2, coins: 20, xp: 0 });
    MockRR.sum.mockResolvedValue(0);

    await expect(rewardService.requestReward(2, 5)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 409 when same reward already has a pending request', async () => {
    MockReward.findByPk.mockResolvedValue({ id: 5, isActive: true, coinCost: 30, familyId: FAMILY });
    MockUser.findByPk.mockResolvedValue({ id: 2, familyId: FAMILY });
    MockRR.findOne.mockResolvedValue({ id: 99, status: 'Pending' }); // existing

    await expect(rewardService.requestReward(2, 5)).rejects.toMatchObject({ status: 409 });
  });

  it('accounts for other pending reservations in balance check', async () => {
    MockReward.findByPk.mockResolvedValue({ id: 5, isActive: true, coinCost: 30, familyId: FAMILY });
    MockUser.findByPk.mockResolvedValue({ id: 2, familyId: FAMILY });
    MockRR.findOne.mockResolvedValue(null);
    MockProfile.findOne.mockResolvedValue({ userId: 2, coins: 50, xp: 0 });
    MockRR.sum.mockResolvedValue(25); // 25 coins already reserved for another request

    // effectiveCoins = 50 - 25 = 25 < 30 coinCost
    await expect(rewardService.requestReward(2, 5)).rejects.toMatchObject({ status: 400 });
  });
});

// ── approveRequest (HU-27) ───────────────────────────────────────────────────
describe('rewardService.approveRequest', () => {
  it('deducts reserved coins and records RewardRedeemed Transaction', async () => {
    const rr = makeRR();
    MockRR.findByPk.mockResolvedValue(rr);
    MockProfile.findOne.mockResolvedValue({
      userId: 2, coins: 100,
      update: jest.fn().mockResolvedValue(undefined),
    });
    MockTx.create.mockResolvedValue({});

    await rewardService.approveRequest(10, FAMILY);

    const profile = (await MockProfile.findOne()) as any;
    expect(profile.update).toHaveBeenCalledWith({ coins: 70 }); // 100 - 30
    expect(MockTx.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RewardRedeemed', coinsDelta: -30, xpDelta: 0 })
    );
    expect(rr.update).toHaveBeenCalledWith({ status: 'Approved' });
  });

  it('throws 400 when request is not Pending', async () => {
    MockRR.findByPk.mockResolvedValue(makeRR({ status: 'Approved' }));
    await expect(rewardService.approveRequest(10, FAMILY)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 403 when reward belongs to different family', async () => {
    MockRR.findByPk.mockResolvedValue(makeRR({ reward: { id: 5, name: 'X', familyId: 'other-family', coinCost: 30 } }));
    await expect(rewardService.approveRequest(10, FAMILY)).rejects.toMatchObject({ status: 403 });
  });
});

// ── rejectRequest (HU-28) ────────────────────────────────────────────────────
describe('rewardService.rejectRequest', () => {
  it('marks request as Rejected without modifying coins (coins were reserved, not deducted)', async () => {
    const rr = makeRR();
    MockRR.findByPk.mockResolvedValue(rr);

    await rewardService.rejectRequest(10, FAMILY, 'No corresponde');

    expect(rr.update).toHaveBeenCalledWith({
      status: 'Rejected',
      rejectionReason: 'No corresponde',
    });
    // Profile.update should NOT be called
    expect(MockProfile.findOne).not.toHaveBeenCalled();
  });

  it('throws 400 when request is not Pending', async () => {
    MockRR.findByPk.mockResolvedValue(makeRR({ status: 'Rejected' }));
    await expect(rewardService.rejectRequest(10, FAMILY)).rejects.toBeInstanceOf(AppError);
  });
});
