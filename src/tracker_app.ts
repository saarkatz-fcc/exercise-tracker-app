import { Request, Response } from 'express';
import User from './models/user';


async function all_users(req:Request, res:Response) {
    const users = await User.find({})
    res.json(users);
}


export { all_users };
