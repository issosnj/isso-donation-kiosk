import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // Get Express instance to handle OPTIONS at the lowest level
  const expressApp = app.getHttpAdapter().getInstance();

  // Enable CORS with explicit configuration - MUST be before global prefix
  const corsOrigin = process.env.CORS_ORIGIN || process.env.ADMIN_WEB_URL || 'http://localhost:3000';
  const adminWebUrl = process.env.ADMIN_WEB_URL || corsOrigin;
  
  // Normalize URLs (remove trailing slashes)
  const normalizeUrl = (url: string) => url.replace(/\/$/, '');
  const normalizedAdminWebUrl = normalizeUrl(adminWebUrl);
  const normalizedCorsOrigin = normalizeUrl(corsOrigin);
  
  // Build allowed origins list (with and without trailing slashes)
  const allowedOrigins = [
    normalizedAdminWebUrl,
    normalizedCorsOrigin,
    adminWebUrl,
    corsOrigin,
    'http://localhost:3000',
    'http://localhost:3001',
    'https://issodonationkiosk.netlify.app', // Explicitly allow Netlify domain
  ].filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates

  console.log(`[CORS] ADMIN_WEB_URL: ${adminWebUrl}`);
  console.log(`[CORS] CORS_ORIGIN: ${corsOrigin}`);
  console.log(`[CORS] Normalized URLs: ${normalizedAdminWebUrl}, ${normalizedCorsOrigin}`);
  console.log(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`[CORS] NODE_ENV: ${process.env.NODE_ENV}`);

  // Helper function to check if origin is allowed
  const isOriginAllowed = (origin: string | undefined): boolean => {
    if (!origin) return true; // Allow requests with no origin
    
    const normalizedOrigin = normalizeUrl(origin);
    
    // Check exact match
    if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) {
      return true;
    }
    
    // Check if it's a Netlify URL (more flexible matching for any Netlify subdomain)
    const isNetlifyUrl = origin.includes('.netlify.app') || origin.startsWith('https://issodonationkiosk');
    if (isNetlifyUrl) {
      console.log(`[CORS] ✓ Allowing Netlify origin: ${origin}`);
      return true;
    }
    
    return false;
  };

  // CORS middleware - MUST be first to handle all requests including OPTIONS
  expressApp.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    const allowed = isOriginAllowed(origin);
    
    // Always set CORS headers if origin is allowed
    if (allowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    
    // Handle OPTIONS preflight requests immediately
    if (req.method === 'OPTIONS') {
      console.log(`[OPTIONS] Preflight request to: ${req.path}`);
      console.log(`[OPTIONS] Origin: ${origin || 'none'}`);
      console.log(`[OPTIONS] Origin allowed: ${allowed}`);
      
      if (allowed) {
        console.log(`[OPTIONS] ✓ Preflight allowed for origin: ${origin}`);
        return res.status(204).end();
      } else {
        console.error(`[OPTIONS] ✗ Blocked origin: ${origin}`);
        console.error(`[OPTIONS] Allowed origins: ${allowedOrigins.join(', ')}`);
        return res.status(403).end();
      }
    }
    
    next();
  });

  // Also handle OPTIONS with explicit route (backup)
  expressApp.options('*', (req: any, res: any) => {
    const origin = req.headers.origin;
    const allowed = isOriginAllowed(origin);
    
    console.log(`[OPTIONS ROUTE] Preflight request to: ${req.path}`);
    console.log(`[OPTIONS ROUTE] Origin: ${origin || 'none'}`);
    console.log(`[OPTIONS ROUTE] Origin allowed: ${allowed}`);
    
    if (allowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
      console.log(`[OPTIONS ROUTE] ✓ Preflight allowed for origin: ${origin}`);
      return res.status(204).end();
    } else {
      console.error(`[OPTIONS ROUTE] ✗ Blocked origin: ${origin}`);
      console.error(`[OPTIONS ROUTE] Allowed origins: ${allowedOrigins.join(', ')}`);
      return res.status(403).end();
    }
  });

  // Add /api route handler at Express level BEFORE NestJS routing
  // This must be early to catch /api requests before they go through NestJS
  expressApp.get('/api', (req: any, res: any) => {
    res.json({
      message: 'ISSO Donation Kiosk API',
      version: '1.0',
      docs: '/api/docs',
      endpoints: {
        auth: '/api/auth',
        temples: '/api/temples',
        users: '/api/users',
        devices: '/api/devices',
        donations: '/api/donations',
      },
    });
  });

  // Add request logging middleware BEFORE CORS
  app.use((req: any, res: any, next: any) => {
    console.log(`[REQUEST] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    next();
  });
  
  // Enable CORS using NestJS's built-in CORS (works better with Railway's proxy)
  app.enableCors({
    origin: (origin, callback) => {
      // Use the same helper function
      const allowed = isOriginAllowed(origin);
      
      // Log the check (always log in production for debugging)
      console.log(`[CORS] Checking origin: ${origin}`);
      console.log(`[CORS] Origin allowed: ${allowed}`);

      if (allowed) {
        console.log(`[CORS] ✓ Allowed origin: ${origin}`);
        callback(null, true);
      } else {
        console.error(`[CORS] ✗ Blocked origin: ${origin}`);
        console.error(`[CORS] Allowed origins were: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Add health check endpoint BEFORE global prefix (Railway needs this)
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API prefix - set AFTER CORS and route handlers
  app.setGlobalPrefix('api');

  // Add root route handler (after global prefix, this handles / which becomes /api)
  const adapter = app.getHttpAdapter();
  adapter.get('/', (req, res) => {
    res.json({
      message: 'ISSO Donation Kiosk API',
      version: '1.0',
      docs: '/api/docs',
      endpoints: {
        auth: '/api/auth',
        temples: '/api/temples',
        users: '/api/users',
        devices: '/api/devices',
        donations: '/api/donations',
      },
    });
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ISSO Donation Kiosk API')
    .setDescription('API for donation kiosk system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();


