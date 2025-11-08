import express from 'express';
import cors from 'cors';
import * as bodyParser from "body-parser";
import { config } from "dotenv";
import { connectDB } from './db/db';
import pollRoutes from './routes/polls';
import resultRoutes from './routes/results';

config();

const app = express();

app.use(express.json())
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(bodyParser.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


app.use('/api/polls', pollRoutes);
app.use('/api/results', resultRoutes);

const port = process.env.PORT || "5151"

const startServer = async () => {
  await connectDB();
  
  app.listen(parseInt(port), () => {
    console.log(`Server running on port ${port}`);
  });
};

startServer();