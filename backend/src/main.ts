import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // Enable CORS with explicit configuration - MUST be before global prefix
  const adminWebUrl = process.env.ADMIN_WEB_URL || 'http://localhost:3000';
  
  // Build allowed origins list
  const allowedOrigins = [
    adminWebUrl,
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  console.log(`[CORS] ADMIN_WEB_URL: ${adminWebUrl}`);
  console.log(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`[CORS] NODE_ENV: ${process.env.NODE_ENV}`);

  // Add explicit CORS middleware BEFORE anything else
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    console.log(`[REQUEST] ${req.method} ${req.path} - Origin: ${origin || 'none'}`);
    
    // Handle OPTIONS preflight requests explicitly
    if (req.method === 'OPTIONS') {
      console.log(`[CORS] Handling OPTIONS preflight request`);
      
      // Check if origin is allowed
      const isNetlifyUrl = origin && (
        origin.includes('.netlify.app') ||
        origin.match(/^https?:\/\/.*\.netlify\.app/)
      );
      const isAllowed = !origin || allowedOrigins.includes(origin) || isNetlifyUrl;
      
      if (isAllowed) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400');
        console.log(`[CORS] ✓ OPTIONS preflight allowed for origin: ${origin}`);
        return res.status(204).send();
      } else {
        console.error(`[CORS] ✗ OPTIONS preflight blocked for origin: ${origin}`);
        return res.status(403).send();
      }
    }
    
    next();
  });
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        console.log(`[CORS] Allowing request with no origin`);
        return callback(null, true);
      }

      // Check if it's a Netlify URL (more flexible matching)
      const isNetlifyUrl = origin && (
        origin.includes('.netlify.app') ||
        origin.match(/^https?:\/\/.*\.netlify\.app/)
      );
      
      // Check if it's in the allowed list
      const isAllowed = allowedOrigins.includes(origin);
      
      // Log the check (always log in production for debugging)
      console.log(`[CORS] Checking origin: ${origin}`);
      console.log(`[CORS] Is Netlify URL: ${isNetlifyUrl}`);
      console.log(`[CORS] Is in allowed list: ${isAllowed}`);

      if (isAllowed || isNetlifyUrl) {
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

