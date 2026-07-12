# Caching Strategy

**Last Updated:** 2026-06-20
**Status:** Phase 2+ Implemented (Redis, ADR-016, ADR-029)
**Tags:** performance, scalability, caching, Redis

---

## Overview

This document defines the caching strategy for SEKAR to improve performance and reduce database load as the system scales from 30 workers (Phase 1) to 500+ workers (Phase 2+).

**Goals:**
- Reduce database query load by 60-70%
- Achieve <200ms API response times for cached data
- Support 500 concurrent users
- Minimize stale data issues

**Technology:** Redis 7+ (in-memory key-value store)

---

## When to Implement

### Implementation Status

**Phase 1 (Shipped):** Not required (30 workers)
**Phase 2+ (Shipped):** ✅ **Implemented** (ADR-016, ADR-029)
- Redis Streams for event sourcing (monitoring pipeline)
- Redis Adapter for Socket.IO (WebSocket scaling)
- Cache layer for frequently accessed data
- Supports 500+ concurrent users

**Deployment:**
- Development: Redis at localhost:6379 (docker-compose)
- Staging: Managed Redis on AWS
- Production: On-prem Redis in docker-compose.prod.yml

---

## Caching Layers

### 1. API Response Cache (Redis)

Cache computed responses to reduce database queries.

#### Cacheable Endpoints

| Endpoint | TTL | Invalidation Trigger |
|----------|-----|---------------------|
| `GET /locations` | 24 hours | Location CRUD operations |
| `GET /locations/:id` | 24 hours | Location update |
| `GET /location-types` | 7 days | Rarely changes |
| `GET /users` (list) | 5 minutes | User CRUD operations |
| `GET /users/:id` | 1 hour | User update |
| `GET /supervisor/dashboard` | 30 seconds | Shift/report changes |
| `GET /shifts/my-shifts` | 1 minute | Shift changes |
| `GET /reports` (list) | 2 minutes | Report submission/review |

**Do NOT Cache:**
- Authentication endpoints (login, refresh)
- Clock-in/out operations (real-time critical)
- Location tracking (always fresh data)
- Report submission (write operations)

#### Implementation Pattern

```typescript
// File: apps/be/src/common/decorators/cache.decorator.ts
import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL, CacheKey } from '@nestjs/cache-manager';

export function ApiCache(ttl: number, keyPrefix?: string) {
  return applyDecorators(
    CacheTTL(ttl),
    CacheKey(keyPrefix),
    UseInterceptors(CacheInterceptor),
  );
}

// Usage in controller
@Get('dashboard')
@ApiCache(30) // 30 seconds
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('supervisor', 'admin')
async getDashboardStats(@GetUser() user: User) {
  return this.supervisorService.getDashboardStats(user.id);
}
```

---

### 2. Database Query Cache (Redis)

Cache expensive database aggregations and joins.

#### Cacheable Queries

**Active Workers Count:**
```typescript
// Cache key: `stats:active_workers:${date}`
// TTL: 1 minute
const cacheKey = `stats:active_workers:${format(new Date(), 'yyyy-MM-dd')}`;
let count = await redis.get(cacheKey);

if (!count) {
  count = await this.shiftsRepository
    .createQueryBuilder('shift')
    .where('shift.clock_out_time IS NULL')
    .getCount();

  await redis.setex(cacheKey, 60, count);
}
```

**Supervisor Dashboard Aggregations:**
```typescript
// Cache key: `dashboard:${supervisor_id}:${date}`
// TTL: 30 seconds
interface DashboardStats {
  totalWorkers: number;
  activeShifts: number;
  pendingReports: number;
  completedReports: number;
  locationsWithActivity: number;
}
```

**Location Boundaries (GPS coordinates):**
```typescript
// Cache key: `area:${location_id}:boundaries`
// TTL: 24 hours
// Invalidate: On location update
interface LocationBoundary {
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
}
```

---

### 3. Application-Level Cache (In-Memory)

Cache static data in application memory for ultra-fast access.

#### Cacheable Data

**Location Types:**
```typescript
// Singleton service with in-memory cache
@Injectable()
export class LocationTypesCache {
  private cache: LocationType[] = [];
  private lastRefresh: Date;

  async getAll(): Promise<LocationType[]> {
    if (this.shouldRefresh()) {
      this.cache = await this.locationTypeRepository.find();
      this.lastRefresh = new Date();
    }
    return this.cache;
  }

  private shouldRefresh(): boolean {
    if (!this.lastRefresh) return true;
    const hoursSinceRefresh = (Date.now() - this.lastRefresh.getTime()) / (1000 * 60 * 60);
    return hoursSinceRefresh > 24; // Refresh every 24 hours
  }
}
```

**System Constants:**
```typescript
// business-rules.md values cached in memory
export const SYSTEM_CONSTANTS = {
  GPS_BOUNDARY_TOLERANCE: 100,
  GPS_ACCURACY_THRESHOLD: 20,
  LOCATION_UPDATE_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_OFFLINE_QUEUE_SIZE: 100,
  // ... etc
};
```

---

## Cache Invalidation Strategies

### 1. Time-Based Expiration (TTL)

Simple and predictable. Use for data that changes infrequently.

```typescript
await redis.setex('key', 3600, JSON.stringify(data)); // 1 hour TTL
```

### 2. Event-Based Invalidation

Invalidate cache when source data changes.

```typescript
// After updating location
@Put(':id')
async update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
  const updated = await this.locationsService.update(id, dto);

  // Invalidate cache
  await this.cacheManager.del(`area:${id}`);
  await this.cacheManager.del('locations:list');

  return updated;
}
```

### 3. Tag-Based Invalidation (Advanced)

Group related cache keys and invalidate by tag.

```typescript
// Cache with tags
await redis.set('user:123', userData);
await redis.sadd('tag:users', 'user:123');

// Invalidate all user caches
const userKeys = await redis.smembers('tag:users');
await redis.del(...userKeys);
await redis.del('tag:users');
```

---

## Caching Patterns by Use Case

### Pattern 1: Cache-Aside (Lazy Loading)

**When:** Most common pattern, data may or may not be requested

```typescript
async findOne(id: string): Promise<User> {
  // 1. Try cache first
  const cached = await redis.get(`user:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss, query database
  const user = await this.usersRepository.findOne({ where: { id } });

  // 3. Store in cache
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user));

  return user;
}
```

### Pattern 2: Write-Through

**When:** Write operations, ensure cache is always up-to-date

```typescript
async update(id: string, dto: UpdateUserDto): Promise<User> {
  // 1. Update database
  await this.usersRepository.update(id, dto);
  const updated = await this.usersRepository.findOne({ where: { id } });

  // 2. Update cache immediately
  await redis.setex(`user:${id}`, 3600, JSON.stringify(updated));

  return updated;
}
```

### Pattern 3: Read-Through

**When:** Complex queries, always check cache first

```typescript
async getDashboardStats(supervisorId: string): Promise<DashboardStats> {
  const cacheKey = `dashboard:${supervisorId}`;

  return this.cacheManager.wrap(cacheKey, async () => {
    // This function only runs on cache miss
    return this.computeDashboardStats(supervisorId);
  }, { ttl: 30 }); // 30 seconds TTL
}
```

---

## Redis Configuration

### Development

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Production (AWS ElastiCache)

```typescript
// apps/be/src/config/cache.config.ts
export const cacheConfig = {
  store: redisStore,
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  ttl: 300, // Default TTL: 5 minutes
  max: 1000, // Max items in cache
  password: process.env.REDIS_PASSWORD,
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
};
```

**Recommended Instance:** `cache.t3.micro` (0.5 GB) for Phase 2

---

## Monitoring & Metrics

### Key Metrics to Track

```typescript
// Cache hit rate (target: >70%)
const hitRate = (cacheHits / (cacheHits + cacheMisses)) * 100;

// Cache latency (target: <5ms p95)
const cacheLatency = measureLatency(() => redis.get(key));

// Memory usage (target: <80%)
const memoryInfo = await redis.info('memory');
```

### Redis Monitoring Queries

```redis
# Check cache stats
INFO stats

# Monitor slow queries
SLOWLOG GET 10

# Check memory usage
INFO memory

# Monitor hit rate
INFO stats | grep keyspace
```

### CloudWatch Alarms (Production)

- **Cache Hit Rate <60%** → Review caching strategy
- **Memory Usage >80%** → Increase instance size or tune eviction
- **Connection Count >500** → Scale horizontally
- **Latency >10ms (p95)** → Network or Redis performance issue

---

## Cache Warming Strategies

### Startup Warming

Populate cache with frequently accessed data on application startup.

```typescript
// apps/be/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Warm up cache
  const cacheWarmer = app.get(CacheWarmerService);
  await cacheWarmer.warmup();

  await app.listen(3000);
}
```

```typescript
// apps/be/src/common/services/cache-warmer.service.ts
@Injectable()
export class CacheWarmerService {
  constructor(
    private locationsService: LocationsService,
    private locationTypesService: LocationTypesService,
  ) {}

  async warmup() {
    console.log('[Cache] Warming up...');

    // Load all locations (referenced frequently for GPS validation)
    await this.locationsService.findAll();

    // Load location types
    await this.locationTypesService.findAll();

    console.log('[Cache] Warmup complete');
  }
}
```

---

## Cache Eviction Policies

### LRU (Least Recently Used) - Recommended

Evicts least recently accessed keys when memory limit reached.

```redis
maxmemory-policy allkeys-lru
```

**Use cases:**
- General purpose caching
- Mixed read/write patterns
- When all keys can be evicted

### LFU (Least Frequently Used)

Evicts least frequently accessed keys.

```redis
maxmemory-policy allkeys-lfu
```

**Use cases:**
- Hot data identification
- Long-running applications with stable access patterns

---

## Common Pitfalls & Solutions

### Pitfall 1: Cache Stampede

**Problem:** Multiple requests trigger same expensive query simultaneously

**Solution:** Use lock pattern

```typescript
async getWithLock(key: string, computeFn: () => Promise<any>) {
  const lockKey = `lock:${key}`;
  const lockTTL = 10; // 10 seconds

  // Try to acquire lock
  const acquired = await redis.set(lockKey, '1', 'EX', lockTTL, 'NX');

  if (acquired) {
    try {
      // Compute and cache
      const value = await computeFn();
      await redis.setex(key, 300, JSON.stringify(value));
      return value;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Wait for lock holder to finish
    await sleep(100);
    return this.getWithLock(key, computeFn);
  }
}
```

### Pitfall 2: Stale Data

**Problem:** Cache shows outdated information

**Solution:** Set appropriate TTLs and invalidate aggressively

```typescript
// Short TTL for frequently changing data
await redis.setex('active_shifts', 30, data); // 30 seconds

// Event-based invalidation
eventEmitter.on('shift.created', async () => {
  await redis.del('active_shifts');
});
```

### Pitfall 3: Large Object Caching

**Problem:** Caching entire objects wastes memory

**Solution:** Cache only necessary fields

```typescript
// Bad: Cache entire user object (100+ fields)
await redis.set(`user:${id}`, JSON.stringify(user));

// Good: Cache only needed fields
await redis.set(`user:${id}:basic`, JSON.stringify({
  id: user.id,
  username: user.username,
  role: user.role,
}));
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('CachedLocationsService', () => {
  it('should return cached location on second call', async () => {
    const location = await service.findOne('location-id');

    // First call hits database
    expect(repository.findOne).toHaveBeenCalledTimes(1);

    const cachedLocation = await service.findOne('location-id');

    // Second call uses cache
    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(cachedLocation).toEqual(location);
  });
});
```

### Load Tests

```bash
# Artillery load test with caching
artillery quick --count 100 --num 1000 http://localhost:3000/api/locations

# Expected results:
# - Without cache: ~300ms p95, 30% DB CPU
# - With cache: ~50ms p95, 5% DB CPU
```

---

## Migration Plan

### Phase 2.1: Setup Redis (Week 1)

- [ ] Add Redis to docker-compose.yml
- [ ] Add @nestjs/cache-manager dependency
- [ ] Configure Redis connection
- [ ] Add cache health check

### Phase 2.2: Implement Application Cache (Week 2)

- [ ] Cache location types (in-memory)
- [ ] Cache location boundaries (Redis)
- [ ] Cache user profiles (Redis)

### Phase 2.3: Implement API Cache (Week 3)

- [ ] Cache supervisor dashboard (30s TTL)
- [ ] Cache location list endpoints (24h TTL)
- [ ] Cache user list endpoints (5m TTL)

### Phase 2.4: Add Monitoring (Week 4)

- [ ] Redis CloudWatch metrics
- [ ] Cache hit rate dashboard
- [ ] Alerts for low hit rate or high memory

---

## References

- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [Cache Stampede Prevention](https://en.wikipedia.org/wiki/Cache_stampede)
- [ADR-008: Modular Monolith](./decisions/ADR-008-modular-monolith.md)

---

**Last Updated:** 2026-01-16
**Next Review:** Before Phase 2 implementation
**Maintained By:** System Architect, Backend Team
