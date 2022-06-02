import { Router } from 'express';
import tracker_app_view from './tracker_app';

const router = Router();


router.get('/api/users', tracker_app_view)


export default router;
