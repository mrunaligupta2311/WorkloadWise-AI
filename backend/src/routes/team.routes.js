import { Router } from 'express';
import { list } from '../controllers/team.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router=Router(); router.use(authenticate); router.get('/',list); export default router;
