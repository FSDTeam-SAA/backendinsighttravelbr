import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import router from './mainRoute/index.js';
import globalErrorHandler from './errors/globalErrorHandler.js';
import notFound from './middleware/notFound.js';

const app = express();

app.set('trust proxy', true);

app.use(helmet());

app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again after 15 minutes' },
});
app.use(limiter);

app.get('/', (req, res) => res.send('Server is running...!!'));

app.use('/api/v1', router);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
