import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.CORS_ORIGIN || 'https://testapi.nobrackets.io'
        : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Supabase client
const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// Type definitions
interface AuthenticatedRequest extends Request {
  user?: User;
}

// Authentication middleware
const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid authentication token',
    });
    return;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or has expired',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication',
    });
  }
};

// Routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/test-auth', authenticateUser, (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    message: 'Authentication successful',
    authenticated: true,
  });
});

app.get('/config', (_req: Request, res: Response) => {
  const supabaseUrl = process.env.SUPABASE_URL || '';

  if (!supabaseUrl) {
    res.status(500).json({ error: 'Supabase URL not configured' });
    return;
  }

  // Ensure URL has protocol
  let formattedSupabaseUrl = supabaseUrl;
  if (!formattedSupabaseUrl.startsWith('http')) {
    formattedSupabaseUrl = `https://${formattedSupabaseUrl}`;
  }

  // Validate URL format
  try {
    new URL(formattedSupabaseUrl);
  } catch (e) {
    res.status(500).json({ error: 'Invalid Supabase URL configuration' });
    return;
  }

  if (!process.env.SUPABASE_ANON_KEY) {
    res.status(500).json({ error: 'Supabase anonymous key not configured' });
    return;
  }

  const config = {
    apiBaseUrl:
      process.env.NODE_ENV === 'production'
        ? process.env.API_BASE_URL || 'https://testapi.nobrackets.io'
        : `http://localhost:${PORT}`,
    supabaseUrl: formattedSupabaseUrl,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  };

  res.json(config);
});

app.get('/data', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const headers = req.headers;
  try {
    const { data, error } = await supabase.from('names').select('*');

    if (error) {
      res.status(500).json({ error: 'Failed to fetch data' });
      return;
    }

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve index.html with injected Supabase credentials
app.get('/', (_req: Request, res: Response) => {
  const indexPath = path.join(__dirname, '../public/index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Replace placeholder with actual Supabase config
  html = html
    .replace("process.env.SUPABASE_URL || ''", `'${process.env.SUPABASE_URL}'`)
    .replace("process.env.SUPABASE_ANON_KEY || ''", `'${process.env.SUPABASE_ANON_KEY}'`);

  res.send(html);
});

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Create server instance with proper error handling
const server = app
  .listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  })
  .on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Please try a different port or free up port ${PORT}`
      );
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});
