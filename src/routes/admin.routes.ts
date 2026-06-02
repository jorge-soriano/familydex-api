import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/familyIsolation.middleware';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/dashboard',              adminController.getDashboard);       // HU-29
router.get('/notifications',          adminController.getNotifications);   // HU-32
router.get('/children',               adminController.getChildren);        // HU-30
router.get('/children/:id',           adminController.getChild);
router.put('/children/:id',           adminController.updateChild);        // HU-30 edit
router.patch('/children/:id/status',  adminController.toggleChildStatus);  // HU-30 toggle

export default router;
