import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

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
    
    // Check if it's a Netlify URL (more flexible matching)
    const isNetlifyUrl = origin.includes('.netlify.app');
    if (isNetlifyUrl) {
      return true;
    }
    
    return false;
  };

  // Use cors package directly for better Railway compatibility
  const expressApp = app.getHttpAdapter().getInstance();
  
  // Configure CORS with cors package
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      console.log(`[CORS] Checking origin: ${origin || 'none'}`);
      const allowed = isOriginAllowed(origin);
      console.log(`[CORS] Origin allowed: ${allowed}`);
      if (allowed) {
        callback(null, true);
      } else {
        console.error(`[CORS] ✗ Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
  
  expressApp.use(cors(corsOptions));
  
  // Add request logging middleware
  expressApp.use((req: any, res: any, next: any) => {
    console.log(`[REQUEST] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    next();
  });
  
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

  // API prefix - set AFTER CORS
  app.setGlobalPrefix('api');

  // Add root route handler (after global prefix, but handle / explicitly)
  app.getHttpAdapter().get('/', (req, res) => {
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

