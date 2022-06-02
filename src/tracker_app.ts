import { Request, Response } from 'express';


async function tracker_app_view(req:Request, res:Response) {
    res.json({ res: 'Hello World' })
}


export default tracker_app_view;
