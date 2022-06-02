import { Router } from 'express';
import { all_users } from './tracker_app';

const router = Router();


router.get('/api/users', all_users);


export default router;
