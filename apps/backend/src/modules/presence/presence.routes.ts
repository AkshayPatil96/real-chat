import { Router } from 'express';
import { getPresenceStatus } from './presence.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(protect);

router.post('/status', getPresenceStatus);

export default router;
