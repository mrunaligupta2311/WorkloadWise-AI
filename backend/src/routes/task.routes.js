import { Router } from 'express';
import * as controller from '../controllers/task.controller.js';
import { authenticate, allowRoles } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', controller.list);
router.post('/', allowRoles('ADMIN', 'MANAGER'), controller.create);
router.post('/:id/work-logs', controller.logWork);
router.patch('/:id', controller.update);
router.delete('/:id', allowRoles('ADMIN', 'MANAGER'), controller.remove);

export default router;
