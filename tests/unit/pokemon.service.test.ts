import { pokemonService, calcLevel } from '../../src/services/pokemon.service';
import { Pokemon } from '../../src/models/pokemon.model';
import { CaughtPokemon } from '../../src/models/caughtPokemon.model';
import { ChildProfile } from '../../src/models/childProfile.model';
import { AppError } from '../../src/middlewares/errorHandler.middleware';

jest.mock('../../src/models/pokemon.model', () => ({
  Pokemon: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn() },
}));
jest.mock('../../src/models/caughtPokemon.model', () => ({
  CaughtPokemon: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn(), count: jest.fn(), update: jest.fn(), findByPk: jest.fn() },
}));
jest.mock('../../src/models/childProfile.model', () => ({
  ChildProfile: { findOne: jest.fn() },
}));

const MockPokemon  = Pokemon       as unknown as { findAll:jest.Mock; findByPk:jest.Mock; findOne:jest.Mock };
const MockCaught   = CaughtPokemon as unknown as { findOne:jest.Mock; findAll:jest.Mock; create:jest.Mock; count:jest.Mock; update:jest.Mock; findByPk:jest.Mock };
const MockProfile  = ChildProfile  as unknown as { findOne:jest.Mock };

const fakePokemon = (overrides = {}) => ({
  id: 1, pokedexNumber: 4, name: 'Charmander', type1: 'Fuego', type2: null,
  unlockXp: 0, evolutionOrder: 1, evolvesToPokedexNumber: 5, evolvesAtLevel: 16,
  evolutionTrigger: null, ...overrides,
});

const fakeCaught = (overrides = {}) => ({
  id: 10, childId: 2, pokemonId: 1, isActive: true, pokemonXp: 0,
  caughtAt: new Date(),
  update: jest.fn().mockImplementation(function(this: any, v: any) { Object.assign(this, v); return Promise.resolve(this); }),
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

// ── calcLevel ────────────────────────────────────────────────────────────────
describe('calcLevel', () => {
  it('level 0 at 0 XP', () => expect(calcLevel(0)).toBe(0));
  it('level 4 at 64 XP (4^3=64)', () => expect(calcLevel(64)).toBe(4));
  it('level 16 at 4096 XP (16^3=4096)', () => expect(calcLevel(4096)).toBe(16));
  it('level 15 at 4095 XP (just below threshold)', () => expect(calcLevel(4095)).toBe(15));
});

// ── chooseInitial ─────────────────────────────────────────────────────────────
describe('pokemonService.chooseInitial', () => {
  it('creates CaughtPokemon with isActive=true for first-time onboarding', async () => {
    MockCaught.count.mockResolvedValue(0);
    MockPokemon.findByPk.mockResolvedValue(fakePokemon());
    MockCaught.create.mockResolvedValue(fakeCaught());

    await pokemonService.chooseInitial(2, 1);

    expect(MockCaught.create).toHaveBeenCalledWith(
      expect.objectContaining({ childId: 2, pokemonId: 1, isActive: true, pokemonXp: 0 })
    );
  });

  it('throws 409 if child already has a Pokémon', async () => {
    MockCaught.count.mockResolvedValue(1);
    await expect(pokemonService.chooseInitial(2, 1)).rejects.toMatchObject({ status: 409 });
  });

  it('throws 400 for invalid starter (capturable, not initial)', async () => {
    MockCaught.count.mockResolvedValue(0);
    MockPokemon.findByPk.mockResolvedValue(fakePokemon({ unlockXp: 5000 }));
    await expect(pokemonService.chooseInitial(2, 1)).rejects.toMatchObject({ status: 400 });
  });
});

// ── addXpToActive ─────────────────────────────────────────────────────────────
describe('pokemonService.addXpToActive', () => {
  it('adds XP to active CaughtPokemon', async () => {
    const caught = { ...fakeCaught({ pokemonXp: 10 }), pokemon: fakePokemon({ evolvesAtLevel: null }) };
    MockCaught.findOne.mockResolvedValue(caught);

    await pokemonService.addXpToActive(2, 50);
    expect(caught.update).toHaveBeenCalledWith({ pokemonXp: 60 });
  });

  it('triggers evolution when level reaches evolvesAtLevel', async () => {
    // 16^3 = 4096, so at 4096 XP the pokemon reaches level 16
    const caught = {
      ...fakeCaught({ pokemonXp: 4095 }),
      pokemon: fakePokemon({ evolvesAtLevel: 16, evolvesToPokedexNumber: 5 }),
    };
    MockCaught.findOne.mockResolvedValue(caught);
    MockCaught.findByPk.mockResolvedValue({
      ...caught,
      update: jest.fn().mockResolvedValue(undefined),
    });
    const nextForm = fakePokemon({ id: 2, pokedexNumber: 5, name: 'Charmeleon' });
    MockPokemon.findOne.mockResolvedValue(nextForm);
    MockCaught.create.mockResolvedValue({});

    const result = await pokemonService.addXpToActive(2, 1); // 4095+1=4096, level=16
    expect(result).not.toBeNull();
    expect(result!.evolvedTo.name).toBe('Charmeleon');
  });

  it('returns null when child has no active Pokémon', async () => {
    MockCaught.findOne.mockResolvedValue(null);
    const result = await pokemonService.addXpToActive(2, 50);
    expect(result).toBeNull();
  });
});

// ── evolve ────────────────────────────────────────────────────────────────────
describe('pokemonService.evolve', () => {
  it('creates evolved CaughtPokemon inheriting pokemonXp, deactivates old', async () => {
    const caught = {
      ...fakeCaught({ pokemonXp: 500 }),
      pokemon: fakePokemon({ evolvesToPokedexNumber: 5, evolutionTrigger: null }),
    };
    MockCaught.findByPk.mockResolvedValue(caught);
    MockPokemon.findOne.mockResolvedValue(fakePokemon({ id: 2, pokedexNumber: 5, name: 'Charmeleon' }));
    MockCaught.create.mockResolvedValue({});

    await pokemonService.evolve(10);

    expect(caught.update).toHaveBeenCalledWith({ isActive: false });
    expect(MockCaught.create).toHaveBeenCalledWith(
      expect.objectContaining({ pokemonId: 2, isActive: true, pokemonXp: 500 })
    );
  });
});

// ── capture ───────────────────────────────────────────────────────────────────
describe('pokemonService.capture', () => {
  it('creates CaughtPokemon when pending slots available', async () => {
    MockProfile.findOne.mockResolvedValue({ userId: 2, xp: 5000, coins: 0 });
    MockCaught.count.mockResolvedValue(1); // already has starter
    MockPokemon.findByPk.mockResolvedValue(fakePokemon({ unlockXp: 5000 }));
    MockCaught.findOne.mockResolvedValue(null); // not yet caught
    MockCaught.create.mockResolvedValue({});

    await pokemonService.capture(2, 1);
    expect(MockCaught.create).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false, pokemonXp: 0 })
    );
  });

  it('throws 400 when no pending captures available', async () => {
    MockProfile.findOne.mockResolvedValue({ userId: 2, xp: 0, coins: 0 });
    MockCaught.count.mockResolvedValue(1); // maxPokemon=1, already full
    await expect(pokemonService.capture(2, 1)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 409 when Pokémon already in collection', async () => {
    MockProfile.findOne.mockResolvedValue({ userId: 2, xp: 10000, coins: 0 });
    MockCaught.count.mockResolvedValue(1);
    MockPokemon.findByPk.mockResolvedValue(fakePokemon({ unlockXp: 5000 }));
    MockCaught.findOne.mockResolvedValue({ id: 5 }); // already caught
    await expect(pokemonService.capture(2, 1)).rejects.toMatchObject({ status: 409 });
  });

  it('allows capture after evolution — evolved form does not consume a slot', async () => {
    // Child has 11000 XP → maxPokemon=3. count returns 1 (only base Charmander).
    // Charmeleon is the evolved form and is NOT counted by the filtered query.
    MockProfile.findOne.mockResolvedValue({ userId: 2, xp: 11000, coins: 0 });
    MockCaught.count.mockResolvedValue(1); // only base-form catches
    MockPokemon.findByPk.mockResolvedValue(fakePokemon({ unlockXp: 5000, evolutionOrder: null }));
    MockCaught.findOne.mockResolvedValue(null);
    MockCaught.create.mockResolvedValue({});

    await pokemonService.capture(2, 99);
    expect(MockCaught.create).toHaveBeenCalled();
  });

  it('CaughtPokemon.count is called with as:pokemon include to exclude evolutions', async () => {
    MockProfile.findOne.mockResolvedValue({ userId: 2, xp: 5000, coins: 0 });
    MockCaught.count.mockResolvedValue(1);
    MockPokemon.findByPk.mockResolvedValue(fakePokemon({ unlockXp: 5000 }));
    MockCaught.findOne.mockResolvedValue(null);
    MockCaught.create.mockResolvedValue({});

    await pokemonService.capture(2, 1);

    expect(MockCaught.count).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ as: 'pokemon' }),
        ]),
      })
    );
  });
});

// ── setActive ─────────────────────────────────────────────────────────────────
describe('pokemonService.setActive', () => {
  it('deactivates current active and activates the selected one', async () => {
    const target = fakeCaught({ id: 20, isActive: false });
    MockCaught.findOne.mockResolvedValue(target);
    MockCaught.update.mockResolvedValue([1]);

    await pokemonService.setActive(2, 20);

    expect(MockCaught.update).toHaveBeenCalledWith(
      { isActive: false }, expect.objectContaining({ where: { childId: 2, isActive: true } })
    );
    expect(target.update).toHaveBeenCalledWith({ isActive: true });
  });

  it('throws 404 when CaughtPokemon not found for this child', async () => {
    MockCaught.findOne.mockResolvedValue(null);
    await expect(pokemonService.setActive(2, 99)).rejects.toMatchObject({ status: 404 });
  });
});
