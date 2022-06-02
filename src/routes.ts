import { Router } from 'express';
import { Validator } from 'express-json-validator-middleware';
import { all_users, create_user, create_exercise, get_log } from './tracker_app';
import { create_user_schema, create_exercise_schema } from './tracker_app_schemas';

const router = Router();
const { validate } = new Validator({});


router.get('/api/users', all_users);
router.post('/api/users', validate({ body: create_user_schema }), create_user);
router.post('/api/users/:_id/exercises', validate({ body: create_exercise_schema }), create_exercise);
router.get('/api/users/:_id/logs', get_log);


export default router;
