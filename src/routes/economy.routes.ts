import { Router } from 'express';
import { economyController } from '../controllers/economy.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/familyIsolation.middleware';

const router = Router();

router.use(authenticate);

router.get('/balance',      economyController.getBalance);   // child + admin
router.get('/transactions', economyController.getHistory);   // child + admin
router.post('/penalty',       requireAdmin, economyController.applyPenalty);    // HU-13
router.post('/direct-reward', requireAdmin, economyController.directReward);   // kept for compat
router.post('/direct-record', requireAdmin, economyController.directRecord);   // unified

export default router;
