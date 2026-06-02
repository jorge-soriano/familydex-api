import { Request, Response, NextFunction } from 'express';
import { pokemonService } from '../services/pokemon.service';
import { Pokemon } from '../models/pokemon.model';

export const pokemonController = {
  // GET /api/pokemon/catalog — full catalog ordered by pokedexNumber
  async getCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const catalog = await Pokemon.findAll({ order: [['pokedexNumber', 'ASC']] });
      res.json(catalog);
    } catch (err) { next(err); }
  },

  // GET /api/pokemon/starters — initial choices for onboarding (HU-17)
  async getStarters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const starters = await pokemonService.getInitialChoices();
      res.json(starters);
    } catch (err) { next(err); }
  },

  // POST /api/pokemon/choose-initial (child) — HU-17
  async chooseInitial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pokemonId } = req.body as { pokemonId: number };
      if (!pokemonId) { res.status(400).json({ message: 'Falta pokemonId' }); return; }
      const caught = await pokemonService.chooseInitial(req.user!.userId, Number(pokemonId));
      res.status(201).json(caught);
    } catch (err) { next(err); }
  },

  // GET /api/pokemon — collection + active pokemon (HU-18/21)
  async getCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const childId = req.user!.role === 'child'
        ? req.user!.userId
        : Number(req.query.childId);

      const [active, collection] = await Promise.all([
        pokemonService.getActivePokemon(childId),
        pokemonService.getCollection(childId),
      ]);
      res.json({ active, collection });
    } catch (err) { next(err); }
  },

  // GET /api/pokemon/available — capturable Pokémon (HU-20)
  async getAvailable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const available = await pokemonService.getAvailableToCapture(req.user!.userId);
      res.json(available);
    } catch (err) { next(err); }
  },

  // POST /api/pokemon/capture (child) — HU-20
  async capture(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pokemonId } = req.body as { pokemonId: number };
      if (!pokemonId) { res.status(400).json({ message: 'Falta pokemonId' }); return; }
      const caught = await pokemonService.capture(req.user!.userId, Number(pokemonId));
      res.status(201).json(caught);
    } catch (err) { next(err); }
  },

  // PUT /api/pokemon/active (child) — HU-21
  async setActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { caughtPokemonId } = req.body as { caughtPokemonId: number };
      if (!caughtPokemonId) { res.status(400).json({ message: 'Falta caughtPokemonId' }); return; }
      const caught = await pokemonService.setActive(req.user!.userId, Number(caughtPokemonId));
      res.json(caught);
    } catch (err) { next(err); }
  },
};
