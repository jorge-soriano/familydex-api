import { activityService } from '../../src/services/activity.service';
import { ChildProfile } from '../../src/models/childProfile.model';
import { Transaction } from '../../src/models/transaction.model';
import { User } from '../../src/models/user.model';
import { AppError } from '../../src/middlewares/errorHandler.middleware';

jest.mock('../../src/models/childProfile.model', () => ({
  ChildProfile: { findOne: jest.fn() },
}));
jest.mock('../../src/models/transaction.model', () => ({
  Transaction: { create: jest.fn(), findAll: jest.fn() },
}));
jest.mock('../../src/models/user.model', () => ({
  User: { findAll: jest.fn(), findOne: jest.fn() },
}));
jest.mock('../../src/models/caughtPokemon.model', () => ({
  CaughtPokemon: { count: jest.fn().mockResolvedValue(1) },
}));
jest.mock('../../src/services/pokemon.service', () => ({
  pokemonService: { addXpToActive: jest.fn().mockResolvedValue(null) },
}));

const MockProfile     = ChildProfile as unknown as { findOne: jest.Mock };
const MockTransaction = Transaction  as unknown as { create: jest.Mock; findAll: jest.Mock };
const MockUser        = User         as unknown as { findAll: jest.Mock; findOne: jest.Mock };

const makeProfile = (coins: number, xp: number) => ({
  coins, xp,
  update: jest.fn().mockImplementation(function(this: any, vals: any) {
    Object.assign(this, vals); return Promise.resolve(this);
  }),
});

beforeEach(() => jest.clearAllMocks());

// ── addCoinsAndXp ────────────────────────────────────────────────────────────
describe('activityService.addCoinsAndXp', () => {
  it('updates ChildProfile coins and xp, records TaskReward Transaction', async () => {
    const profile = makeProfile(100, 500);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await activityService.addCoinsAndXp(2, 10, 20, 'Tarea: Test', 1);

    expect(profile.update).toHaveBeenCalledWith({ coins: 110, xp: 520 });
    expect(MockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TaskReward', coinsDelta: 10, xpDelta: 20 })
    );
  });

  it('throws 404 when child profile not found', async () => {
    MockProfile.findOne.mockResolvedValue(null);
    await expect(activityService.addCoinsAndXp(99, 5, 5, 'test')).rejects.toMatchObject({ status: 404 });
  });
});


// ── getBalance ────────────────────────────────────────────────────────────────
const MockCaught = require('../../src/models/caughtPokemon.model').CaughtPokemon as { count: jest.Mock };

describe('activityService.getBalance', () => {
  it('returns coins, xp and correct maxPokemon calculation', async () => {
    MockProfile.findOne.mockResolvedValue(makeProfile(200, 12500));
    MockCaught.count.mockResolvedValue(1);

    const balance = await activityService.getBalance(2);

    expect(balance).toMatchObject({
      coins: 200,
      xp: 12500,
      maxPokemon: 3,   // 1 + floor(12500/5000) = 3
    });
  });

  it('maxPokemon is 1 (starter slot) when xp < 5000', async () => {
    MockProfile.findOne.mockResolvedValue(makeProfile(0, 4999));
    MockCaught.count.mockResolvedValue(1);
    const balance = await activityService.getBalance(2);
    expect(balance.maxPokemon).toBe(1);
  });

  it('pendingCaptures counts only base-form catches (not evolutions)', async () => {
    // Child has 11000 XP → maxPokemon=3. Has Charmander (base) + Charmeleon (evolved).
    // count returns 1 because the include filters to evolutionOrder=1|null.
    MockProfile.findOne.mockResolvedValue(makeProfile(0, 11000));
    MockCaught.count.mockResolvedValue(1); // only Charmander counts

    const balance = await activityService.getBalance(2);

    expect(balance.maxPokemon).toBe(3);
    expect(balance.caughtCount).toBe(1);
    expect(balance.pendingCaptures).toBe(2);
  });

  it('CaughtPokemon.count is called with as:pokemon include to exclude evolutions', async () => {
    MockProfile.findOne.mockResolvedValue(makeProfile(0, 5000));
    MockCaught.count.mockResolvedValue(1);

    await activityService.getBalance(2);

    expect(MockCaught.count).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ as: 'pokemon' }),
        ]),
      })
    );
  });

  it('throws 404 when profile not found', async () => {
    MockProfile.findOne.mockResolvedValue(null);
    await expect(activityService.getBalance(99)).rejects.toMatchObject({ status: 404 });
  });
});

// ── getHistory ────────────────────────────────────────────────────────────────
describe('activityService.getHistory', () => {
  it('returns child transactions ordered by date desc', async () => {
    const txs = [{ id: 2 }, { id: 1 }];
    MockTransaction.findAll.mockResolvedValue(txs);

    const result = await activityService.getHistory(2);
    expect(result).toHaveLength(2);
    expect(MockTransaction.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ childId: 2 }) })
    );
  });

  it('filters by type when provided', async () => {
    MockTransaction.findAll.mockResolvedValue([]);
    await activityService.getHistory(2, { type: 'Penalty' });
    expect(MockTransaction.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ type: 'Penalty' }) })
    );
  });
});

// ── assertChildInFamily ───────────────────────────────────────────────────────
describe('activityService.assertChildInFamily', () => {
  it('passes when child belongs to family', async () => {
    MockUser.findOne.mockResolvedValue({ id: 2 });
    await expect(activityService.assertChildInFamily(2, 'family-uuid')).resolves.toBeUndefined();
  });

  it('throws 403 when child not in family', async () => {
    MockUser.findOne.mockResolvedValue(null);
    await expect(
      activityService.assertChildInFamily(2, 'other-family')
    ).rejects.toMatchObject({ status: 403 });
  });
});


// ── applyDirectRecord ─────────────────────────────────────────────────────────
describe('activityService.applyDirectRecord', () => {
  it('positive coinsDelta adds coins + XP, creates DirectRecord transaction', async () => {
    const profile = makeProfile(100, 500);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await activityService.applyDirectRecord([2], 20, 50, 'Buen comportamiento');

    expect(profile.update).toHaveBeenCalledWith({ coins: 120, xp: 550 });
    expect(MockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DirectRecord', coinsDelta: 20, xpDelta: 50 })
    );
  });

  it('negative coinsDelta deducts coins (floors at 0)', async () => {
    const profile = makeProfile(10, 200);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await activityService.applyDirectRecord([2], -30, 0, 'Penalización');

    // Only 10 can be deducted (profile had 10)
    expect(profile.update).toHaveBeenCalledWith({ coins: 0, xp: 200 });
    expect(MockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ coinsDelta: -10 })
    );
  });

  it('XP never negative — throws when xp < 0', async () => {
    await expect(
      activityService.applyDirectRecord([2], 10, -5, 'test')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when coinsDelta=0 and xp=0', async () => {
    await expect(
      activityService.applyDirectRecord([2], 0, 0, 'nada')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('handles multiple children — creates one transaction per child', async () => {
    const p1 = makeProfile(50, 100);
    const p2 = makeProfile(30, 200);
    MockProfile.findOne
      .mockResolvedValueOnce(p1)
      .mockResolvedValueOnce(p2);
    MockTransaction.create.mockResolvedValue({});

    await activityService.applyDirectRecord([2, 3], 10, 50, 'Recompensa colectiva');

    expect(MockTransaction.create).toHaveBeenCalledTimes(2);
  });

  it('calls pokemonService.addXpToActive for each child when xp > 0', async () => {
    MockProfile.findOne.mockResolvedValue(makeProfile(0, 0));
    MockTransaction.create.mockResolvedValue({});
    const { pokemonService } = require('../../src/services/pokemon.service');
    jest.clearAllMocks();
    MockProfile.findOne.mockResolvedValue(makeProfile(0, 0));
    MockTransaction.create.mockResolvedValue({});

    await activityService.applyDirectRecord([2], 5, 30, 'XP bonus');
    expect(pokemonService.addXpToActive).toHaveBeenCalledWith(2, 30);
  });
});
