import { Router } from 'express';
import { activityController } from '../controllers/activity.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/familyIsolation.middleware';

const router = Router();
router.use(authenticate);

router.get('/balance',       activityController.getBalance);    // child + admin
router.get('/transactions',  activityController.getHistory);    // child + admin
router.post('/direct-record', requireAdmin, activityController.directRecord); // unified reward/penalty

export default router;
