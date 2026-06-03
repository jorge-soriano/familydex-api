import { Op } from 'sequelize';
import { Pokemon } from '../models/pokemon.model';
import { CaughtPokemon } from '../models/caughtPokemon.model';
import { ChildProfile } from '../models/childProfile.model';
import { AppError } from '../middlewares/errorHandler.middleware';

export interface EvoResult {
  evolvedTo: Pokemon;
  trigger: string | null;
}

export interface CollectionItem {
  id: number;
  pokemonId: number;
  isActive: boolean;
  pokemonXp: number;
  level: number;
  caughtAt: Date;
  pokemon: Pokemon;
}

export interface ActivePokemonResult extends CollectionItem {
  xpForNextLevel: number;
  progressPercent: number;
  isFinalForm: boolean;
  evolveLevel: number | null;
}

export function calcLevel(pokemonXp: number): number {
  return Math.floor(Math.cbrt(pokemonXp));
}

export const pokemonService = {
  /** Returns the 4 starter Pokémon for onboarding (unlockXp=0, evolutionOrder=1). HU-17 */
  async getInitialChoices(): Promise<Pokemon[]> {
    return Pokemon.findAll({
      where: { unlockXp: 0, evolutionOrder: 1 },
      order: [['pokedexNumber', 'ASC']],
    });
  },

  /** One-time initial selection. Throws if child already has a Pokémon. HU-17 */
  async chooseInitial(childId: number, pokemonId: number): Promise<CaughtPokemon> {
    const existing = await CaughtPokemon.count({ where: { childId } });
    if (existing > 0) throw new AppError(409, 'Ya elegiste tu Pokémon inicial');

    const pokemon = await Pokemon.findByPk(pokemonId);
    if (!pokemon || pokemon.unlockXp !== 0 || pokemon.evolutionOrder !== 1) {
      throw new AppError(400, 'Pokémon no disponible para selección inicial');
    }

    return CaughtPokemon.create({
      childId,
      pokemonId,
      isActive: true,
      pokemonXp: 0,
      caughtAt: new Date(),
    });
  },

  /** Returns active Pokémon with level, XP progress and evolution info. HU-18 */
  async getActivePokemon(childId: number): Promise<ActivePokemonResult | null> {
    const caught = await CaughtPokemon.findOne({
      where: { childId, isActive: true },
      include: [{ model: Pokemon, as: 'pokemon' }],
    });
    if (!caught) return null;

    const pokemon = (caught as any).pokemon as Pokemon;
    const level = calcLevel(caught.pokemonXp);
    const xpForCurrentLevel = Math.pow(level, 3);
    const xpForNextLevel    = Math.pow(level + 1, 3);
    const progressPercent   = level === 0
      ? 0
      : Math.round(((caught.pokemonXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100);

    return {
      id: caught.id, pokemonId: caught.pokemonId, isActive: true,
      pokemonXp: caught.pokemonXp, level, caughtAt: caught.caughtAt, pokemon,
      xpForNextLevel: Math.round(xpForNextLevel),
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
      isFinalForm: !pokemon.evolvesToPokedexNumber,
      evolveLevel: pokemon.evolvesAtLevel,
    };
  },

  /** Full collection with levels. HU-18/21 */
  async getCollection(childId: number): Promise<CollectionItem[]> {
    const caught = await CaughtPokemon.findAll({
      where: { childId },
      include: [{ model: Pokemon, as: 'pokemon' }],
      order: [['caughtAt', 'ASC']],
    });
    return caught.map((c) => ({
      id: c.id, pokemonId: c.pokemonId, isActive: c.isActive,
      pokemonXp: c.pokemonXp, level: calcLevel(c.pokemonXp), caughtAt: c.caughtAt,
      pokemon: (c as any).pokemon as Pokemon,
    }));
  },

  /**
   * Adds XP to the active Pokémon. Triggers evolution if level threshold reached.
   * Called by activityService.addCoinsAndXp. HU-19
   */
  async addXpToActive(childId: number, xp: number): Promise<EvoResult | null> {
    const caught = await CaughtPokemon.findOne({
      where: { childId, isActive: true },
      include: [{ model: Pokemon, as: 'pokemon' }],
    });
    if (!caught) return null; // child hasn't done onboarding yet

    const newXp = caught.pokemonXp + xp;
    await caught.update({ pokemonXp: newXp });

    const pokemon = (caught as any).pokemon as Pokemon;
    if (pokemon.evolvesAtLevel && calcLevel(newXp) >= pokemon.evolvesAtLevel) {
      return pokemonService.evolve(caught.id);
    }
    return null;
  },

  /** Creates evolved CaughtPokemon, deactivates old one. HU-19 */
  async evolve(caughtPokemonId: number): Promise<EvoResult | null> {
    const caught = await CaughtPokemon.findByPk(caughtPokemonId, {
      include: [{ model: Pokemon, as: 'pokemon' }],
    });
    if (!caught) return null;

    const current = (caught as any).pokemon as Pokemon;
    if (!current.evolvesToPokedexNumber) return null;

    const nextForm = await Pokemon.findOne({
      where: { pokedexNumber: current.evolvesToPokedexNumber },
    });
    if (!nextForm) return null;

    await caught.update({ isActive: false });
    await CaughtPokemon.create({
      childId: caught.childId,
      pokemonId: nextForm.id,
      isActive: true,
      pokemonXp: caught.pokemonXp,
      caughtAt: new Date(),
    });

    return { evolvedTo: nextForm, trigger: current.evolutionTrigger };
  },

  /** Pokémon available for capture (unlockXp > 0, unlockXp ≤ child.xp, not yet caught). HU-20 */
  /**
   * Returns ALL capturable pokemon (unlockXp > 0) not yet owned by the child,
   * ordered by unlockXp. Includes locked ones — the frontend distinguishes
   * available vs locked using the child's current XP from the balance.
   * HU-20
   */
  async getAvailableToCapture(childId: number): Promise<Pokemon[]> {
    const profile = await ChildProfile.findOne({ where: { userId: childId } });
    if (!profile) return [];

    const alreadyCaught = await CaughtPokemon.findAll({
      where: { childId },
      attributes: ['pokemonId'],
    });
    const caughtIds = alreadyCaught.map((c) => c.pokemonId);

    // Only base forms (evolutionOrder=1) and standalone pokemon (null) are capturable.
    // Evolutions (Charmeleon, Charizard…) are obtained by evolving, not by capture.
    return Pokemon.findAll({
      where: {
        [Op.or]: [{ evolutionOrder: null }, { evolutionOrder: 1 }],
        unlockXp: { [Op.gte]: 0, [Op.lte]: profile.xp },
        ...(caughtIds.length ? { id: { [Op.notIn]: caughtIds } } : {}),
      },
      order: [['unlockXp', 'ASC']],
    });
  },

  /** Captures a Pokémon if the child has pending capture slots. HU-20 */
  async capture(childId: number, pokemonId: number): Promise<CaughtPokemon> {
    const profile = await ChildProfile.findOne({ where: { userId: childId } });
    if (!profile) throw new AppError(404, 'Perfil no encontrado');

    // Slot 0 is always the starter; every 5000 XP earns one more slot
    const maxPokemon = 1 + Math.floor(profile.xp / 5000);
    // Count only base-form catches (evolvesFrom IS NULL) — evolved forms
    // add a row to CaughtPokemon but don't consume a capture slot.
    const totalCaught = await CaughtPokemon.count({
      where: { childId },
      include: [{ model: Pokemon, where: { evolvesFrom: null }, required: true }],
    });
    if (totalCaught >= maxPokemon) {
      throw new AppError(400, 'No tienes capturas pendientes disponibles');
    }

    const pokemon = await Pokemon.findByPk(pokemonId);
    if (!pokemon) throw new AppError(400, 'Pokémon no encontrado');
    if (pokemon.evolutionOrder !== null && pokemon.evolutionOrder > 1) {
      throw new AppError(400, 'Las evoluciones no se capturan, se obtienen evolucionando');
    }
    if (pokemon.unlockXp > profile.xp) {
      throw new AppError(400, 'No tienes suficiente XP para capturar este Pokémon');
    }

    const alreadyCaught = await CaughtPokemon.findOne({ where: { childId, pokemonId } });
    if (alreadyCaught) throw new AppError(409, 'Ya tienes este Pokémon en tu colección');

    return CaughtPokemon.create({
      childId, pokemonId, isActive: false, pokemonXp: 0, caughtAt: new Date(),
    });
  },

  /** Sets a Pokémon from the collection as active. HU-21 */
  async setActive(childId: number, caughtPokemonId: number): Promise<CaughtPokemon> {
    const target = await CaughtPokemon.findOne({ where: { id: caughtPokemonId, childId } });
    if (!target) throw new AppError(404, 'Pokémon no encontrado en tu colección');

    await CaughtPokemon.update({ isActive: false }, { where: { childId, isActive: true } });
    await target.update({ isActive: true });
    return target;
  },
};
