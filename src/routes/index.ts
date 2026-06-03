import { Router } from 'express';
import authRoutes    from './auth.routes';
import taskRoutes    from './task.routes';
import activityRoutes from './activity.routes';
import pokemonRoutes from './pokemon.routes';
import rewardRoutes  from './reward.routes';
import adminRoutes   from './admin.routes';

const router = Router();

router.use('/auth',    authRoutes);
router.use('/tasks',   taskRoutes);
router.use('/activity', activityRoutes);
router.use('/pokemon', pokemonRoutes);
router.use('/rewards', rewardRoutes);
router.use('/admin',   adminRoutes);

export default router;
