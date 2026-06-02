import { economyService } from '../../src/services/economy.service';
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
describe('economyService.addCoinsAndXp', () => {
  it('updates ChildProfile coins and xp, records TaskReward Transaction', async () => {
    const profile = makeProfile(100, 500);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await economyService.addCoinsAndXp(2, 10, 20, 'Tarea: Test', 1);

    expect(profile.update).toHaveBeenCalledWith({ coins: 110, xp: 520 });
    expect(MockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TaskReward', coinsDelta: 10, xpDelta: 20 })
    );
  });

  it('throws 404 when child profile not found', async () => {
    MockProfile.findOne.mockResolvedValue(null);
    await expect(economyService.addCoinsAndXp(99, 5, 5, 'test')).rejects.toMatchObject({ status: 404 });
  });
});

// ── applyPenalty ─────────────────────────────────────────────────────────────
describe('economyService.applyPenalty', () => {
  it('deducts coins and records Penalty Transaction', async () => {
    const profile = makeProfile(100, 500);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await economyService.applyPenalty(2, 30, 'Mal comportamiento');

    expect(profile.update).toHaveBeenCalledWith({ coins: 70 });
    expect(MockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Penalty', coinsDelta: -30, xpDelta: 0 })
    );
  });

  it('coins floor at 0 — never goes negative', async () => {
    const profile = makeProfile(10, 200);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await economyService.applyPenalty(2, 50, 'Penalización grande');

    // Only 10 could be deducted (min of 50 and 10)
    expect(profile.update).toHaveBeenCalledWith({ coins: 0 });
    expect(MockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ coinsDelta: -10 })
    );
  });

  it('XP is never affected by a penalty', async () => {
    const profile = makeProfile(50, 1000);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await economyService.applyPenalty(2, 20, 'reason');

    expect(MockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ xpDelta: 0 })
    );
    // xp not touched
    expect(profile.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ xp: expect.anything() })
    );
  });
});

// ── getBalance ────────────────────────────────────────────────────────────────
describe('economyService.getBalance', () => {
  it('returns coins, xp and correct maxPokemon calculation', async () => {
    MockProfile.findOne.mockResolvedValue(makeProfile(200, 12500));

    const balance = await economyService.getBalance(2);

    expect(balance).toMatchObject({
      coins: 200,
      xp: 12500,
      maxPokemon: 3,   // 1 (starter slot) + floor(12500 / 5000) = 1 + 2
    });
  });

  it('maxPokemon is 1 (starter slot) when xp < 5000', async () => {
    MockProfile.findOne.mockResolvedValue(makeProfile(0, 4999));
    const balance = await economyService.getBalance(2);
    expect(balance.maxPokemon).toBe(1); // always at least 1 (starter slot)
  });

  it('throws 404 when profile not found', async () => {
    MockProfile.findOne.mockResolvedValue(null);
    await expect(economyService.getBalance(99)).rejects.toMatchObject({ status: 404 });
  });
});

// ── getHistory ────────────────────────────────────────────────────────────────
describe('economyService.getHistory', () => {
  it('returns child transactions ordered by date desc', async () => {
    const txs = [{ id: 2 }, { id: 1 }];
    MockTransaction.findAll.mockResolvedValue(txs);

    const result = await economyService.getHistory(2);
    expect(result).toHaveLength(2);
    expect(MockTransaction.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ childId: 2 }) })
    );
  });

  it('filters by type when provided', async () => {
    MockTransaction.findAll.mockResolvedValue([]);
    await economyService.getHistory(2, { type: 'Penalty' });
    expect(MockTransaction.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ type: 'Penalty' }) })
    );
  });
});

// ── assertChildInFamily ───────────────────────────────────────────────────────
describe('economyService.assertChildInFamily', () => {
  it('passes when child belongs to family', async () => {
    MockUser.findOne.mockResolvedValue({ id: 2 });
    await expect(economyService.assertChildInFamily(2, 'family-uuid')).resolves.toBeUndefined();
  });

  it('throws 403 when child not in family', async () => {
    MockUser.findOne.mockResolvedValue(null);
    await expect(
      economyService.assertChildInFamily(2, 'other-family')
    ).rejects.toMatchObject({ status: 403 });
  });
});

// ── applyDirectReward ─────────────────────────────────────────────────────────
describe('economyService.applyDirectReward', () => {
  it('adds coins and XP to profile, records DirectReward Transaction', async () => {
    const profile = makeProfile(100, 500);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await economyService.applyDirectReward(2, 15, 75, 'Buen comportamiento');

    expect(profile.update).toHaveBeenCalledWith({ coins: 115, xp: 575 });
    expect(MockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DirectReward', coinsDelta: 15, xpDelta: 75 })
    );
  });

  it('XP never decreases — applyDirectReward only adds', async () => {
    const profile = makeProfile(50, 1000);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await economyService.applyDirectReward(2, 0, 100, 'bonus XP');
    expect(profile.update).toHaveBeenCalledWith({ coins: 50, xp: 1100 });
  });

  it('throws 400 when both coins and xp are 0', async () => {
    await expect(
      economyService.applyDirectReward(2, 0, 0, 'nada')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when coins is negative', async () => {
    await expect(
      economyService.applyDirectReward(2, -5, 0, 'negativo')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('calls pokemonService.addXpToActive when xp > 0', async () => {
    const profile = makeProfile(0, 0);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});
    const { pokemonService } = require('../../src/services/pokemon.service');

    await economyService.applyDirectReward(2, 0, 50, 'xp bonus');

    expect(pokemonService.addXpToActive).toHaveBeenCalledWith(2, 50);
  });

  it('does NOT call pokemonService.addXpToActive when xp = 0', async () => {
    const profile = makeProfile(100, 0);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});
    const { pokemonService } = require('../../src/services/pokemon.service');
    jest.clearAllMocks();
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await economyService.applyDirectReward(2, 10, 0, 'solo monedas');
    expect(pokemonService.addXpToActive).not.toHaveBeenCalled();
  });
});

// ── applyDirectRecord ─────────────────────────────────────────────────────────
describe('economyService.applyDirectRecord', () => {
  it('positive coinsDelta adds coins + XP, creates DirectRecord transaction', async () => {
    const profile = makeProfile(100, 500);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await economyService.applyDirectRecord([2], 20, 50, 'Buen comportamiento');

    expect(profile.update).toHaveBeenCalledWith({ coins: 120, xp: 550 });
    expect(MockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DirectRecord', coinsDelta: 20, xpDelta: 50 })
    );
  });

  it('negative coinsDelta deducts coins (floors at 0)', async () => {
    const profile = makeProfile(10, 200);
    MockProfile.findOne.mockResolvedValue(profile);
    MockTransaction.create.mockResolvedValue({});

    await economyService.applyDirectRecord([2], -30, 0, 'Penalización');

    // Only 10 can be deducted (profile had 10)
    expect(profile.update).toHaveBeenCalledWith({ coins: 0, xp: 200 });
    expect(MockTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ coinsDelta: -10 })
    );
  });

  it('XP never negative — throws when xp < 0', async () => {
    await expect(
      economyService.applyDirectRecord([2], 10, -5, 'test')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when coinsDelta=0 and xp=0', async () => {
    await expect(
      economyService.applyDirectRecord([2], 0, 0, 'nada')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('handles multiple children — creates one transaction per child', async () => {
    const p1 = makeProfile(50, 100);
    const p2 = makeProfile(30, 200);
    MockProfile.findOne
      .mockResolvedValueOnce(p1)
      .mockResolvedValueOnce(p2);
    MockTransaction.create.mockResolvedValue({});

    await economyService.applyDirectRecord([2, 3], 10, 50, 'Recompensa colectiva');

    expect(MockTransaction.create).toHaveBeenCalledTimes(2);
  });

  it('calls pokemonService.addXpToActive for each child when xp > 0', async () => {
    MockProfile.findOne.mockResolvedValue(makeProfile(0, 0));
    MockTransaction.create.mockResolvedValue({});
    const { pokemonService } = require('../../src/services/pokemon.service');
    jest.clearAllMocks();
    MockProfile.findOne.mockResolvedValue(makeProfile(0, 0));
    MockTransaction.create.mockResolvedValue({});

    await economyService.applyDirectRecord([2], 5, 30, 'XP bonus');
    expect(pokemonService.addXpToActive).toHaveBeenCalledWith(2, 30);
  });
});
