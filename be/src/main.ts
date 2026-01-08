import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('SEKAR API')
    .setDescription(
      'API documentation for SEKAR (Sistem Evaluasi Kerja Satgas RTH) - Worker tracking and task management system for DKRTH Surabaya',
    )
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('areas', 'Area management endpoints (Phase 1 Day 3-4)')
    .addTag('shifts', 'Worker shift tracking endpoints (Phase 1 Day 3-4)')
    .addTag('reports', 'Work report endpoints (Phase 1 Day 5)')
    .addTag('location', 'Location tracking endpoints (Phase 1 Day 5)')
    .addTag('supervisor', 'Supervisor dashboard endpoints (Phase 1 Day 5)')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 SEKAR Backend API is running on: http://localhost:${port}/api`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
