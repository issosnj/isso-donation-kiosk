import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  const adminWebUrl = process.env.ADMIN_WEB_URL || 'http://localhost:3000';
  
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        adminWebUrl,
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      // Allow all Netlify URLs (including preview deployments and custom domains)
      const isNetlifyUrl = origin && (
        origin.match(/https:\/\/.*\.netlify\.app$/) ||
        origin.match(/https:\/\/.*\.netlify\.app\/$/)
      );

      // Log CORS check for debugging (always log errors, detailed logs in dev)
      if (!origin || allowedOrigins.includes(origin) || isNetlifyUrl) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[CORS] Allowed origin: ${origin}`);
        }
        callback(null, true);
      } else {
        console.error(`[CORS] Blocked origin: ${origin}`);
        console.error(`[CORS] ADMIN_WEB_URL: ${adminWebUrl}`);
        console.error(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
        console.error(`[CORS] Is Netlify URL: ${isNetlifyUrl}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // API prefix
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

