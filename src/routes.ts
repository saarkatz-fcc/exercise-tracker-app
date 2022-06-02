import { Router } from 'express';
import { Validator } from 'express-json-validator-middleware';
import { all_users, create_user, create_exercise } from './tracker_app';
import { create_user_schema } from './tracker_app_schemas';

const router = Router();
const { validate } = new Validator({});


router.get('/api/users', all_users);
router.post('/api/users', validate({ body: create_user_schema }), create_user);
// router.get('/api/users/:_id/logs', tracker_app_view);
// router.post('/api/users/:_id/exercises', tracker_app_view);


export default router;
