import { Router } from 'express';
import authRoutes         from './auth.routes';
import taskRoutes         from './task.routes';
import economyRoutes      from './economy.routes';
import pokemonRoutes      from './pokemon.routes';
import rewardRoutes       from './reward.routes';
import adminRoutes        from './admin.routes';
import taskTemplateRoutes from './taskTemplate.routes';

const router = Router();

router.use('/auth',           authRoutes);
router.use('/tasks',          taskRoutes);
router.use('/economy',        economyRoutes);
router.use('/pokemon',        pokemonRoutes);
router.use('/rewards',        rewardRoutes);
router.use('/admin',          adminRoutes);
router.use('/task-templates', taskTemplateRoutes);

export default router;
