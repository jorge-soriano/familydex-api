import express from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler.middleware';
import router from './routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', router);

app.use(errorHandler);

export default app;
