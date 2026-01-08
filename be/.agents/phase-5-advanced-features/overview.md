# Phase 5 - Advanced Features (Backend)

## 🎯 Objectives

Implement fraud detection, external integrations, route optimization, and multi-language support.

**Duration:** 8 days  
**Prerequisites:** Phase 4 deployed, iOS development starting

---

## 📅 Timeline

| Day | Focus | Features |
|-----|-------|----------|
| Day 1-2 | Fraud Detection | GPS spoofing, photo verification |
| Day 3-4 | Integrations | External APIs, webhooks |
| Day 5 | Route Optimization | Routing service |
| Day 6-7 | i18n & Polish | Multi-language, cleanup |
| Day 8 | Testing | Comprehensive testing |

---

## 🎨 Features

### 1. Fraud Detection

**GPS Spoofing Detection:**
- Unrealistic movement speed
- GPS accuracy validation
- Location consistency checks
- Flagging suspicious patterns

**Photo Verification:**
- EXIF data validation
- Timestamp verification
- Location embedded in photo
- Face recognition (optional)

**Behavior Analysis:**
- Movement patterns
- Clock-in/out timing
- Report submission patterns
- Statistical anomalies

### 2. External Integrations

**API for External Systems:**
- RESTful API endpoints
- API key authentication
- Rate limiting
- Usage logging

**Webhook Support:**
- Event-driven notifications
- Configurable endpoints
- Retry mechanism
- Payload signing

### 3. Route Optimization

**Features:**
- Optimal route for supervisor visits
- Multiple waypoint routing
- Real-time traffic integration
- Estimated travel times

### 4. Multi-Language Support

**Languages:**
- Indonesian (primary)
- English
- Javanese (optional)

**Implementation:**
- Response message localization
- Error messages
- Email templates
- Report templates

---

## 🗄️ Database Changes

```sql
-- Fraud alerts
CREATE TABLE fraud_alerts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  alert_type VARCHAR(50), -- gps_spoof, impossible_movement, invalid_photo
  severity VARCHAR(20), -- low, medium, high
  description TEXT,
  evidence JSONB,
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, confirmed, dismissed
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration webhooks
CREATE TABLE webhooks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[], -- ['shift.clock_in', 'report.created']
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook logs
CREATE TABLE webhook_logs (
  id SERIAL PRIMARY KEY,
  webhook_id INT REFERENCES webhooks(id),
  event VARCHAR(50),
  payload JSONB,
  response_status INT,
  response_body TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API keys for external access
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  permissions TEXT[],
  rate_limit INT DEFAULT 1000,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT REFERENCES users(id),
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔌 API Endpoints

### Fraud Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /fraud/alerts | List fraud alerts |
| GET | /fraud/alerts/:id | Get alert detail |
| PATCH | /fraud/alerts/:id/review | Review alert |
| GET | /fraud/stats | Fraud statistics |

### Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /integrations/webhooks | List webhooks |
| POST | /integrations/webhooks | Create webhook |
| PATCH | /integrations/webhooks/:id | Update webhook |
| DELETE | /integrations/webhooks/:id | Delete webhook |
| POST | /integrations/webhooks/:id/test | Test webhook |
| GET | /integrations/api-keys | List API keys |
| POST | /integrations/api-keys | Create API key |
| DELETE | /integrations/api-keys/:id | Revoke API key |

### Route Optimization

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /routing/optimize | Get optimized route |
| GET | /routing/eta | Get ETA to location |

### External API (for third-party systems)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /external/v1/workers | Export workers |
| GET | /external/v1/attendance | Export attendance |
| GET | /external/v1/reports | Export reports |

---

## 🏗️ Module Structure

```
src/modules/
├── fraud-detection/
│   ├── fraud-detection.module.ts
│   ├── fraud-detection.controller.ts
│   ├── fraud-detection.service.ts
│   ├── fraud-detection.service.spec.ts
│   ├── detectors/
│   │   ├── gps-spoof.detector.ts
│   │   ├── photo-verification.detector.ts
│   │   └── behavior-analysis.detector.ts
│   └── entities/
│       └── fraud-alert.entity.ts
├── integrations/
│   ├── integrations.module.ts
│   ├── integrations.controller.ts
│   ├── integrations.service.ts
│   ├── webhook.service.ts
│   ├── api-key.service.ts
│   └── entities/
│       ├── webhook.entity.ts
│       ├── webhook-log.entity.ts
│       └── api-key.entity.ts
├── routing/
│   ├── routing.module.ts
│   ├── routing.controller.ts
│   └── routing.service.ts
└── i18n/
    ├── i18n.module.ts
    ├── i18n.service.ts
    └── translations/
        ├── id.json
        └── en.json
```

---

## 🔍 Fraud Detection Algorithms

### GPS Spoofing Detection

```typescript
// Check for impossible movement speed
function detectImpossibleMovement(
  previousLocation: Location,
  currentLocation: Location,
  timeDiffSeconds: number
): boolean {
  const distance = calculateDistance(previousLocation, currentLocation);
  const speedKmh = (distance / 1000) / (timeDiffSeconds / 3600);
  
  // Flag if speed > 150 km/h (unrealistic for walking/driving in city)
  return speedKmh > 150;
}

// Check for GPS accuracy anomalies
function detectAccuracyAnomaly(
  accuracy: number,
  historicalAccuracies: number[]
): boolean {
  const avgAccuracy = average(historicalAccuracies);
  // Flag if current accuracy is 5x worse than average
  return accuracy > avgAccuracy * 5;
}
```

### Photo Verification

```typescript
// Validate EXIF data
function validatePhotoExif(exifData: ExifData): ValidationResult {
  const issues = [];
  
  // Check timestamp is recent
  if (exifData.dateTime) {
    const photoTime = new Date(exifData.dateTime);
    const now = new Date();
    if (Math.abs(now - photoTime) > 300000) { // 5 minutes
      issues.push('Photo timestamp not recent');
    }
  }
  
  // Check GPS in EXIF matches submitted GPS
  if (exifData.gps) {
    const distance = calculateDistance(exifData.gps, submittedGps);
    if (distance > 100) {
      issues.push('Photo GPS does not match submitted location');
    }
  }
  
  return { valid: issues.length === 0, issues };
}
```

---

## 🧪 Testing Requirements

| Module | Target | Key Tests |
|--------|--------|-----------|
| Fraud Detection | >80% | Spoof detection, alerts |
| Integrations | >80% | Webhooks, API keys |
| Routing | >80% | Route optimization |
| i18n | >80% | Translation loading |

---

## ✅ Success Criteria

1. ✅ GPS spoofing detected
2. ✅ Photo verification works
3. ✅ Webhooks delivered reliably
4. ✅ API keys work for external access
5. ✅ Route optimization functional
6. ✅ Multi-language support working
7. ✅ All modules >80% coverage

---

## 📝 Dependencies

```bash
npm install @nestjs/throttler  # Rate limiting
npm install @googlemaps/google-maps-services-js  # Routing
npm install exifr              # EXIF reading
npm install nestjs-i18n        # Internationalization
```

---

*Last Updated: January 2026*

