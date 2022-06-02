import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors'
import { AddressInfo } from 'net';
import router from './routes';

// init project
dotenv.config();
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI);
}
let app = express();

// enable cors
app.use(cors({optionsSuccessStatus: 200}));

// middleware for post requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
    res.sendFile(__dirname + '/views/index.html');
});

app.use(router);

// listen for requests :)
let listener = app.listen(process.env.PORT || 3000, function () {
    const port = (listener.address() as AddressInfo).port
    if (port) {
        console.log('Your app is listening on port ' + port);
    }
    else {
        console.log('Your app failed to start!');
    }
});
