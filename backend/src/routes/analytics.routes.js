import { Router } from 'express';
import * as controller from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router=Router(); router.use(authenticate); router.get('/overview',controller.overview); router.get('/workload',controller.workload); router.get('/recommendations', controller.recommendations);

export default router;
