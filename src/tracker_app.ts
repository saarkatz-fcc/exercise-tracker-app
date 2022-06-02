import { Request, Response } from 'express';
import User from './models/user';


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


export { all_users, create_user };
