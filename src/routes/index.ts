import { Router } from 'express';
import authRoutes from './auth.routes';
import taskRoutes from './task.routes';
import economyRoutes from './economy.routes';
import pokemonRoutes from './pokemon.routes';

const router = Router();

router.use('/auth',    authRoutes);        // Épica 1
router.use('/tasks',   taskRoutes);        // Épica 2
router.use('/economy', economyRoutes);     // Épica 3
router.use('/pokemon', pokemonRoutes);     // Épica 4
// router.use('/rewards', rewardRoutes);   // Épica 5
// router.use('/economy', economyRoutes);  // Épica 3
// router.use('/pokemon', pokemonRoutes);  // Épica 4
// router.use('/rewards', rewardRoutes);   // Épica 5

export default router;
