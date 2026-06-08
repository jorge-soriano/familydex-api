import { Router } from 'express';
import { rewardController } from '../controllers/reward.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin, requireChild } from '../middlewares/familyIsolation.middleware';

const router = Router();
router.use(authenticate);

// Rewards CRUD (admin) + list (child+admin)
router.get('/',                  rewardController.getRewards);
router.post('/',                 requireAdmin, rewardController.createReward);
router.put('/:id',               requireAdmin, rewardController.editReward);
router.delete('/:id',            requireAdmin, rewardController.deleteReward);
router.patch('/:id/status',      requireAdmin, rewardController.toggleActive);

// Requests
router.get('/requests',          rewardController.getRequests);              // admin + child
router.post('/requests',         requireChild, rewardController.requestReward); // HU-26
router.post('/requests/:id/approve', requireAdmin, rewardController.approveRequest); // HU-27
router.post('/requests/:id/reject',  requireAdmin, rewardController.rejectRequest);  // HU-28

export default router;
