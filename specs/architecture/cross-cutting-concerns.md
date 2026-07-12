# Cross-Cutting Concerns

**Last Updated:** 2026-01-16
**Status:** Implementation Guide
**Tags:** logging, monitoring, tracing, error-handling

---

## Overview

This document defines cross-cutting concerns that span all modules in the SEKAR system. These are system-wide requirements that affect multiple layers and components.

**Cross-Cutting Concerns:**
1. Logging
2. Error Handling
3. Monitoring & Observability
4. Request Correlation
5. Health Checks
6. Configuration Management

---

## 1. Logging Strategy

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| `ERROR` | System errors, exceptions | Database connection failed |
| `WARN` | Recoverable issues, deprecations | GPS accuracy below threshold |
| `INFO` | Important business events | User logged in, shift started |
| `DEBUG` | Detailed diagnostic information | Query execution time, cache hit/miss |
| `VERBOSE` | Trace-level details | Function entry/exit, variable values |

### Logging Standards

```typescript
// File: apps/be/src/common/interceptors/logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers, body } = request;
    const correlationId = headers['x-correlation-id'] || generateId();

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - startTime;
          this.logger.log({
            method,
            url,
            correlationId,
            duration,
            statusCode: 200,
            userId: request.user?.id,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error({
            method,
            url,
            correlationId,
            duration,
            statusCode: error.status || 500,
            error: error.message,
            userId: request.user?.id,
          });
        },
      }),
    );
  }
}
```

### Structured Logging Format

```json
{
  "timestamp": "2026-01-16T14:30:00.123Z",
  "level": "INFO",
  "context": "ShiftsService",
  "message": "Shift started successfully",
  "correlationId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "userId": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "metadata": {
    "shiftId": "shift-uuid",
    "locationId": "location-uuid",
    "clockInTime": "2026-01-16T14:30:00Z"
  }
}
```

### Log Redaction (PII Protection)

```typescript
// Redact sensitive data before logging
const redactedBody = {
  ...body,
  password: body.password ? '***REDACTED***' : undefined,
  refresh_token: body.refresh_token ? '***REDACTED***' : undefined,
};

logger.log({ ...logEntry, body: redactedBody });
```

### What to Log

**✅ DO Log:**
- Authentication events (login, logout, token refresh)
- Authorization failures
- API requests/responses (with duration)
- Database query performance (slow queries >1s)
- External API calls (success/failure)
- Background jobs (start, completion, errors)
- Business events (shift started, report submitted)

**❌ DON'T Log:**
- Passwords or tokens
- Sensitive PII (unless hashed)
- Large payloads (>1KB)
- Excessive DEBUG logs in production

---

## 2. Error Handling

### Standardized Error Response

```typescript
// File: apps/be/src/common/dto/api-error.dto.ts
export class ApiErrorResponse {
  statusCode: number;
  code: string;  // From ErrorCode enum
  message: string;
  timestamp: string;
  path: string;
  correlationId: string;
  details?: any;  // Optional validation errors
}
```

### Global Exception Filter

```typescript
// File: apps/be/src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const statusCode = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse: ApiErrorResponse = {
      statusCode,
      code: this.extractErrorCode(exception),
      message: this.extractMessage(exception),
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.headers['x-correlation-id'],
    };

    // Log error
    this.logger.error(errorResponse, exception.stack);

    response.status(statusCode).json(errorResponse);
  }
}
```

### Error Code Standardization

See `specs/testing/error-codes.md` for complete list. All errors must use standardized codes:

```typescript
// File: apps/be/src/common/enums/error-codes.enum.ts
export enum ErrorCode {
  // Authentication (1000-1999)
  INVALID_CREDENTIALS = 'AUTH_1001',
  TOKEN_EXPIRED = 'AUTH_1002',
  UNAUTHORIZED = 'AUTH_1003',

  // Shifts (2000-2999)
  ALREADY_CLOCKED_IN = 'SHIFT_2001',
  NOT_CLOCKED_IN = 'SHIFT_2002',
  GPS_OUT_OF_BOUNDS = 'SHIFT_2003',

  // ... etc (see error-codes.md for full list)
}
```

---

## 3. Monitoring & Observability

### Application Metrics

```typescript
// File: apps/be/src/common/interceptors/metrics.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private requestCounter = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
  });

  private requestDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'HTTP request duration in milliseconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  });

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.recordMetrics(request, 200, duration);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.recordMetrics(request, error.status || 500, duration);
        },
      }),
    );
  }

  private recordMetrics(request: any, status: number, duration: number) {
    const labels = {
      method: request.method,
      route: request.route?.path || request.url,
      status: status.toString(),
    };

    this.requestCounter.inc(labels);
    this.requestDuration.observe(labels, duration);
  }
}
```

### Key Metrics to Track

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `http_requests_total` | Counter | Total API requests | - |
| `http_request_duration_ms` | Histogram | Request latency | p95 > 500ms |
| `active_shifts_count` | Gauge | Current active shifts | - |
| `database_query_duration_ms` | Histogram | DB query time | p95 > 100ms |
| `cache_hit_rate` | Gauge | Cache effectiveness | <60% |
| `error_rate` | Counter | Error count by type | >1% of requests |

### Prometheus Endpoint

```typescript
// File: apps/be/src/modules/metrics/metrics.controller.ts
import { Controller, Get } from '@nestjs/common';
import { register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get()
  getMetrics() {
    return register.metrics();
  }
}
```

---

## 4. Request Correlation

### Correlation ID Generation

```typescript
// File: apps/be/src/common/middleware/correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

    // Add to request
    req['correlationId'] = correlationId;

    // Add to response headers
    res.setHeader('X-Correlation-Id', correlationId);

    next();
  }
}
```

### Usage in Logs

```typescript
// All logs include correlationId
this.logger.log({
  correlationId: request['correlationId'],
  message: 'Processing request',
  ...otherData,
});
```

### Client-Side (Mobile)

```typescript
// Mobile app generates and sends correlation ID
const correlationId = uuidv4();

apiClient.defaults.headers.common['X-Correlation-ID'] = correlationId;

// Use same ID for all related requests in a flow
```

**Benefits:**
- Trace requests across services
- Debug issues by searching logs for correlation ID
- Link mobile app logs to backend logs

---

## 5. Health Checks

### Health Check Endpoint

```typescript
// File: apps/be/src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database connectivity
      () => this.db.pingCheck('database'),

      // Memory usage (<80% of heap)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // Redis connectivity (Phase 2+)
      // () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

### Health Check Response

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    }
  }
}
```

### Readiness vs Liveness

**Liveness (`/health`):** Is the app running?
- Check: Process is responsive

**Readiness (`/health/ready`):** Is the app ready to serve traffic?
- Check: Database connected, Redis connected, etc.

```typescript
@Get('ready')
@HealthCheck()
readiness() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    // Add more critical dependencies
  ]);
}
```

---

## 6. Configuration Management

### Environment-Based Config

```typescript
// File: apps/be/src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    name: process.env.DATABASE_NAME || 'sekar_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: '7d',
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
  },
});
```

### Validation

```typescript
// File: apps/be/src/config/env.validation.ts
import { plainToClass } from 'class-transformer';
import { IsString, IsNumber, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  JWT_SECRET: string;

  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  PORT: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
```

### Configuration Per Environment

```bash
# .env.development
NODE_ENV=development
PORT=3000
DATABASE_HOST=localhost

# .env.production
NODE_ENV=production
PORT=3000
DATABASE_HOST=sekar-rds.ap-southeast-1.rds.amazonaws.com
```

---

## Implementation Checklist

### Phase 1 (Completed)
- [x] Basic logging with NestJS Logger
- [x] Error handling with HTTP filters
- [x] Health check endpoint
- [x] Environment configuration

### Phase 2 (Planned)
- [ ] Structured logging with JSON format
- [ ] Correlation ID middleware
- [ ] Prometheus metrics endpoint
- [ ] Request/response logging interceptor
- [ ] CloudWatch integration
- [ ] Sentry error tracking

### Phase 3 (Future)
- [ ] Distributed tracing (Jaeger/Zipkin)
- [ ] Log aggregation (ELK Stack)
- [ ] Custom dashboards (Grafana)
- [ ] Advanced alerting (PagerDuty)

---

## Monitoring Dashboard (Phase 2+)

### Key Dashboard Panels

1. **Request Metrics**
   - Total requests/sec
   - Average response time
   - Error rate

2. **Database Metrics**
   - Active connections
   - Query duration (p50, p95, p99)
   - Slow queries

3. **Application Metrics**
   - Active shifts
   - Pending reports
   - Location logs/hour

4. **System Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O

---

## References

- [NestJS Logging](https://docs.nestjs.com/techniques/logger)
- [NestJS Health Checks](https://docs.nestjs.com/recipes/terminus)
- [Twelve-Factor App - Config](https://12factor.net/config)
- [OpenTelemetry](https://opentelemetry.io/)
- [ADR-008: Modular Monolith](./decisions/ADR-008-modular-monolith.md)

---

**Last Updated:** 2026-06-20
**Status:** Active — Phases 1–5 shipped (Phase 2+ enhancements incorporated)
**Maintained By:** System Architect, DevOps Team
