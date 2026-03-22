import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';


const app = express();

const corsOptions = {
  // Use a function for origin to be more flexible with Vercel subdomains
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      'https://task-manager-front-end-lilac.vercel.app',
      'https://task-manager-front-c6jnzvqqs-narendiran-es-projects.vercel.app'
    ];
    if (!origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Added OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required for PWA assets across domains
}));// Sets various HTTP headers for security
app.use(cors(corsOptions));   // Enables Cross-Origin Resource Sharing
app.options(/.*/, cors(corsOptions));
app.use(express.json()); // Body parser for JSON
app.use(morgan('dev'));  // HTTP request logger
app.use(cookieParser());
app.use(express.static('public'));

// Rate Limiting (Bonus Feature)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', limiter);

// Root Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);


// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

export default app;