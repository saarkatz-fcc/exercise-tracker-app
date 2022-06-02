import { FilterQuery, Document } from 'mongoose';
import { Request, Response } from 'express';
import Exercise, { IExercise } from './models/exercise';
import User, { IUser } from './models/user';
import { get_date } from './timestamp_service_api';


async function all_users(req:Request, res:Response) {
    const users = await User.find({})
    res.json(users);
}

async function create_user(req:Request, res:Response) {
    let user = new User({username: req.body.username});

    const user_exists = await User.findOne({ username: user.username }).exec();
    if (user_exists) {
        user = user_exists;
    }
    else {
        await user.save();
    }

    res.json(user);
}

async function create_exercise(req:Request, res:Response) {
    let errors = [];
    const user = await User.findById(req.params._id).exec();
    if (!user) {
        errors.push('invalid user id');
    }
    let date = await get_date(req.body.date);
    if (!date) {
        errors.push('invalid date');
    }

    if (errors.length > 0) {
        res.status(400).json({ errors })
        return;
    }

    const exercises = new Exercise({
        user_id: user!.id,
        description: req.body.description,
        duration: req.body.duration,
        date
    })

    await exercises.save()

    res.json({ ...user!.toJSON(), ...exercises.toJSON() })
}

async function get_log(req:Request, res:Response) {
    const from_promise = req.query.from ? get_date(req.query.from.toString()) : null;
    const to_promise = req.query.to ? get_date(req.query.to.toString()) : null;
    const limit = req.query.limit ? parseInt(req.query.limit.toString()) : null;
    let user: (Document<unknown, any, IUser> & IUser) | null;
    try {
        user = await User.findById(req.params._id).exec();
    }
    catch {
        res.status(400).json({ error: 'invalid user id' });
        return;
    }
    if (!user) {
        res.status(400).json({ error: 'invalid user id' });
        return;
    }

    let filter: FilterQuery<IExercise> = { user_id: user.id }
    const from = await from_promise;
    const to = await to_promise;

    if (from || to) {
        filter.date = {}
        if (from) {
            filter.date['$gte'] = from;
        }
        if (to) {
            filter.date['$lte'] = to;
        }
    }

    const query = Exercise.find(filter);

    if (limit) {
        query.limit(limit);
    }

    const log = await query.exec();

    res.json({ ...user!.toJSON(), count: log.length, log })
}


export { all_users, create_user, create_exercise, get_log };
