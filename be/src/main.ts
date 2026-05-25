// Load .env BEFORE any other imports so values consumed at decorator-evaluation
// time (e.g. @Throttle on auth.controller) see the env vars. ConfigModule alone
// runs after class-decorator literals are already locked in.
import 'dotenv/config';
import { initSentry } from './common/sentry/sentry';
// Initialize Sentry as early as possible so app-factory errors are captured.
initSentry();
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiVersionInterceptor } from './common/interceptors/api-version.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { initializeFirebase } from './config/firebase.config';
import * as os from 'os';
import * as bodyParser from 'body-parser';

/**
 * Validate critical environment variables before startup.
 * Prevents accidental data loss in staging/prod from DATABASE_SYNCHRONIZE.
 */
function validateEnv(): void {
  const env = process.env.NODE_ENV ?? 'development';
  if (env !== 'development' && process.env.DATABASE_SYNCHRONIZE === 'true') {
    throw new Error(
      `DATABASE_SYNCHRONIZE must be false in ${env} environment! ` +
        'Use migrations instead: npm run migration:run:prod',
    );
  }
  const required = ['DATABASE_HOST', 'DATABASE_PASSWORD', 'JWT_SECRET'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

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

  // Initialize Firebase Admin SDK (for FCM push notifications)
  try {
    initializeFirebase();
  } catch (error) {
    console.warn('⚠️  Firebase Admin SDK not initialized. Push notifications disabled.');
    if (process.env.FCM_ENABLED === 'true') {
      console.error('   Error details:', error.message);
    } else {
      console.warn('   To enable FCM, set FCM_ENABLED=true and provide service account JSON.');
    }
  }

  // Increase body size limit for base64 photo uploads (15MB max for 5 photos at ~3MB each)
  app.use(bodyParser.json({ limit: '15mb' }));
  app.use(bodyParser.urlencoded({ limit: '15mb', extended: true }));

  // Enable CORS with secure defaults
  const corsOrigin = process.env.CORS_ORIGIN?.split(',');
  if (!corsOrigin && process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN must be set in production environment');
  }
  app.enableCors({
    origin: corsOrigin || ['http://localhost:3001', 'http://localhost:19006'],
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

  // Global interceptor for API version tracking + class-transformer
  // serialization so @Exclude decorators (e.g. User.password_hash) are
  // honored on every response that returns an entity instance.
  app.useGlobalInterceptors(
    new ApiVersionInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

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
    .addTag('area-types', 'Area type management endpoints')
    .addTag('areas', 'Area management endpoints')
    .addTag('shifts', 'Worker shift tracking endpoints')
    .addTag('reports', 'Work report endpoints')
    .addTag('location', 'Location tracking endpoints')
    .addTag('supervisor', 'Management dashboard endpoints (Korlap, Kepala Rayon, Top Management)')
    // Phase 2 tags
    .addTag('rayons', 'Rayon (geographic sector) management endpoints')
    .addTag('shift-definitions', 'Shift definition endpoints')
    .addTag('activity-types', 'Activity type management endpoints')
    .addTag('area-staff-requirements', 'Area staff requirements endpoints')
    .addTag('schedules', 'Worker schedule management endpoints')
    .addTag('special-day-overrides', 'Special day override endpoints (holidays, weekends)')
    .addTag('tasks', 'Task management endpoints')
    .addTag('notifications', 'Push notification endpoints')
    .addTag('monitoring', 'Real-time monitoring endpoints')
    .addTag('import', 'KMZ/KML import endpoints')
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

validateEnv();
bootstrap();
