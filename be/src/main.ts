import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiVersionInterceptor } from './common/interceptors/api-version.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as os from 'os';
import * as bodyParser from 'body-parser';

/**
 * Get the local network IP address
 * Returns the first non-internal IPv4 address found
 */
function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const addresses = interfaces[name];
    if (addresses) {
      for (const addr of addresses) {
        // Skip internal (loopback) and non-IPv4 addresses
        // In Node.js, family is a string: 'IPv4' or 'IPv6'
        if (!addr.internal && addr.family === 'IPv4') {
          return addr.address;
        }
      }
    }
  }
  return 'localhost'; // Fallback if no network interface found
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase body size limit for base64 photo uploads (50MB)
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  // Global exception filter for standardized error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global interceptor for API version tracking
  app.useGlobalInterceptors(new ApiVersionInterceptor());

  // Global prefix with versioning
  app.setGlobalPrefix('api/v1');

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('SEKAR API')
    .setDescription(
      'API documentation for SEKAR (Sistem Evaluasi Kerja Satgas RTH) - Worker tracking and task management system for DLH Surabaya',
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
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3000;
  const host = '0.0.0.0'; // Listen on all network interfaces
  await app.listen(port, host);

  const localIp = getLocalIpAddress();
  console.log(`🚀 SEKAR Backend API v1 is running on: http://localhost:${port}/api/v1`);
  console.log(`🌐 Network access: http://${localIp}:${port}/api/v1`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api/v1/docs`);
}

bootstrap();
