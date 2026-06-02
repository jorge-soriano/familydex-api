import { Router } from 'express';
import { taskTemplateController } from '../controllers/taskTemplate.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/familyIsolation.middleware';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/',              taskTemplateController.getTemplates);
router.post('/',             taskTemplateController.createTemplate);
router.put('/:id',           taskTemplateController.editTemplate);
router.patch('/:id/status',  taskTemplateController.toggleStatus);
router.post('/:id/create-task',     taskTemplateController.createTask);
router.post('/:id/quick-complete',  taskTemplateController.quickComplete);

export default router;
