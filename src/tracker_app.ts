import { Request, Response } from 'express';
import Exercise from './models/exercise';
import User from './models/user';
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
        user_id: req.params._id,
        description: req.body.description,
        duration: req.body.duration,
        date
    })

    await exercises.save()

    res.json({ ...user!.toJSON(), ...exercises.toJSON() })
}


export { all_users, create_user, create_exercise };
