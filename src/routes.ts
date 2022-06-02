import { Router } from 'express';
import { all_users, create_user } from './tracker_app';

const router = Router();


router.get('/api/users', all_users);
router.post('/api/users', create_user);
// router.get('/api/users/:_id/logs', tracker_app_view);
// router.post('/api/users/:_id/exercises', tracker_app_view);


export default router;
