import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin, requireChild } from '../middlewares/familyIsolation.middleware';

const router = Router();

// All task routes require authentication
router.use(authenticate);

router.get('/',       taskController.getTasks);          // admin + child
router.post('/',      requireAdmin, taskController.createTask);
router.put('/:id',    requireAdmin, taskController.editTask);
router.delete('/:id', requireAdmin, taskController.deleteTask);

router.post('/quick-complete', requireAdmin, taskController.quickComplete); // before /:id routes
router.post('/:id/complete', requireChild, taskController.completeTask);
router.post('/:id/approve',  requireAdmin, taskController.approveTask);
router.post('/:id/reject',   requireAdmin, taskController.rejectTask);

export default router;
