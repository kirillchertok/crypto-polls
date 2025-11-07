import express from 'express';
import cors from 'cors';
import * as bodyParser from "body-parser";
import { config } from "dotenv";
// import router from "./router";

config();

const app = express();

app.use(express.json())
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))
app.use(bodyParser.json());

// app.use('/api', router);

const port = process.env.PORT

if (!port) {
    console.error('Error while starting the server')
} else {
    app.listen(parseInt(port), () => {
        console.log('Server started on port: ' + port)
    })
}