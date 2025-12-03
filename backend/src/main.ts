import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [
      process.env.ADMIN_WEB_URL || 'http://localhost:3001',
      'http://localhost:3001',
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        console.error('Validation errors:', errors);
        return errors;
      },
    }),
  );

  // Global exception filter for better error logging
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) {
      return next(err);
    }
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';
    res.status(status).json({
      statusCode: status,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

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

