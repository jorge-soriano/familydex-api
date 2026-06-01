import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/familyIsolation.middleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/children', authenticate, requireAdmin, authController.createChild);

export default router;
