import { Router } from 'express';
import { pokemonController } from '../controllers/pokemon.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireChild } from '../middlewares/familyIsolation.middleware';

const router = Router();

router.use(authenticate);

router.get('/catalog',        pokemonController.getCatalog);           // Pokédex completa
router.get('/starters',       pokemonController.getStarters);          // pre-onboarding
router.post('/choose-initial', requireChild, pokemonController.chooseInitial); // HU-17
router.get('/',                pokemonController.getCollection);        // HU-18/21 (child + admin)
router.get('/available',       requireChild, pokemonController.getAvailable);  // HU-20
router.post('/capture',        requireChild, pokemonController.capture);       // HU-20
router.put('/active',          requireChild, pokemonController.setActive);     // HU-21
router.post('/active/evolve',  requireChild, pokemonController.evolveActive);   // manual evolution

export default router;
