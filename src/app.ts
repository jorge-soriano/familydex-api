import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { securityLog } from './config/logger';
import router from './routes';

const app = express();

// ── OWASP A05: Security Headers ──────────────────────────────────────────────
// Helmet sets: X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy,
// X-DNS-Prefetch-Control, Permissions-Policy, X-Download-Options, etc.
app.use(helmet());

// ── OWASP A05: Restrictive CORS ───────────────────────────────────────────────
// Only the configured frontend origin is allowed — prevents unauthorized
// sites from making cross-origin requests with user credentials.
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5174')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // allow server-to-server / curl (no origin header)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── OWASP A04/A07: Rate limiting on auth endpoints ───────────────────────────
// Prevents brute-force attacks on login / registration.
// Trust reverse proxy IPs in production so X-Forwarded-For is used.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const isDev = process.env.NODE_ENV !== 'production';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window per IP
  skip: () => isDev,         // disabled in development
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de acceso. Espera 15 minutos.' },
  handler: (req, res, _next, options) => {
    securityLog.rateLimited(req.ip, req.path);
    res.status(429).json(options.message);
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 registrations per hour per IP
  skip: () => isDev,         // disabled in development
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados registros. Espera una hora.' },
  handler: (req, res, _next, options) => {
    securityLog.rateLimited(req.ip, req.path);
    res.status(429).json(options.message);
  },
});

// Apply rate limiters before the router parses the body
app.use('/api/auth/login',    loginLimiter);
app.use('/api/auth/register', registerLimiter);

// ── General API ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // OWASP A05: limit request body size

app.use('/api', router);

app.use(errorHandler);

export default app;
