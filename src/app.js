import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import router from './mainRoute/index.js';
import globalErrorHandler from './errors/globalErrorHandler.js';
import AppError from './utils/AppError.js';
import { apiLimiter } from './middleware/rateLimiter.middleware.js';

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

app.use(morgan(':method :url :status :response-time ms'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limit — tighter per-resource limits are applied in individual routers
app.use(apiLimiter);

// Root health check
app.get('/', (req, res) =>
  res.status(200).json({ status: 'ok', message: 'Insight Travel API is running' })
);

// Versioned health check (full metadata)
app.get('/api/v1/health', (req, res) =>
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date(),
  })
);

app.use('/api/v1', router);

// 404 — must come after all routes (app.use catches every method in Express 5)
app.use((req, res, next) =>
  next(new AppError(404, `Route ${req.originalUrl} not found`))
);

app.use(globalErrorHandler);

export default app;
