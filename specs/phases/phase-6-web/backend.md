# Phase 6 - Backend Implementation Checklist

**Duration:** 7 days
**Prerequisites:** Phase 2-5 deployed

---

## Scope Clarification

> **Note:** Basic CRUD endpoints for User, Area, Rayon, and Scheduling have been moved to Phase 2. This Phase 6 backend implementation focuses exclusively on:
> - Audit logging system
> - Bulk operations (CSV import/export)
> - Report builder and scheduler
> - Email service integration
> - System settings management

See [Phase 2 Backend Spec](../phase-2-enhanced/backend.md) for basic CRUD implementation.

---

## Overview

Add backend support for audit logging, bulk operations, report scheduling, and system settings management.

---

## New Modules

### 1. Audit Module

**Path:** `be/src/modules/audit/`

```
audit/
├── audit.module.ts
├── audit.controller.ts
├── audit.controller.spec.ts
├── audit.service.ts
├── audit.service.spec.ts
├── audit.interceptor.ts
├── dto/
│   └── query-audit-logs.dto.ts
└── entities/
    └── audit-log.entity.ts
```

### 2. Settings Module

**Path:** `be/src/modules/settings/`

```
settings/
├── settings.module.ts
├── settings.controller.ts
├── settings.controller.spec.ts
├── settings.service.ts
├── settings.service.spec.ts
├── dto/
│   └── update-settings.dto.ts
└── entities/
    └── system-setting.entity.ts
```

### 3. Report Scheduler

**Path:** `be/src/modules/reports/scheduler/`

```
reports/
├── scheduler/
│   ├── report-scheduler.service.ts
│   ├── report-scheduler.service.spec.ts
│   └── scheduled-report.entity.ts
└── ...existing files
```

### 4. Email Service

**Path:** `be/src/shared/services/email.service.ts`

---

## Database Entities

### Audit Log Entity

```typescript
// entities/audit-log.entity.ts
@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: ['create', 'update', 'delete', 'login', 'logout', 'export', 'import'],
  })
  action: string;

  @Column({ name: 'entity_type', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string;

  @Column({ name: 'entity_name', length: 200, nullable: true })
  entityName: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, any>;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, any>;

  @Column({ name: 'changed_fields', type: 'simple-array', nullable: true })
  changedFields: string[];

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

### System Setting Entity

```typescript
// entities/system-setting.entity.ts
@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'value_type', length: 20, default: 'string' })
  valueType: string; // 'string' | 'number' | 'boolean' | 'json'

  @Column({ name: 'category', length: 50, default: 'general' })
  category: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Scheduled Report Entity

```typescript
// entities/scheduled-report.entity.ts
@Entity('scheduled_reports')
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'report_type', length: 50 })
  reportType: string; // 'attendance', 'performance', 'reports', 'custom'

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, any>;

  @Column({ type: 'simple-array', nullable: true })
  columns: string[];

  @Column({ name: 'output_format', length: 20, default: 'pdf' })
  outputFormat: string; // 'pdf', 'csv', 'xlsx'

  @Column({ name: 'schedule_cron', length: 100 })
  scheduleCron: string;

  @Column({ name: 'schedule_description', length: 200, nullable: true })
  scheduleDescription: string;

  @Column({ name: 'email_recipients', type: 'simple-array' })
  emailRecipients: string[];

  @Column({ name: 'email_subject', length: 200, nullable: true })
  emailSubject: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @Column({ name: 'next_run_at', type: 'timestamp', nullable: true })
  nextRunAt: Date;

  @Column({ name: 'last_run_status', length: 20, nullable: true })
  lastRunStatus: string; // 'success', 'failed'

  @Column({ name: 'last_run_error', type: 'text', nullable: true })
  lastRunError: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## API Endpoints

### Audit Logs

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | /audit-logs | List audit logs | Admin |
| GET | /audit-logs/:id | Get audit log detail | Admin |
| GET | /audit-logs/export | Export audit logs | Admin |

### System Settings

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | /settings | Get all settings | Admin |
| GET | /settings/:key | Get single setting | Admin |
| PATCH | /settings | Update settings | Admin |
| POST | /settings/reset | Reset to defaults | Admin |

### Scheduled Reports

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | /reports/scheduled | Create scheduled report | Admin, Supervisor |
| GET | /reports/scheduled | List scheduled reports | Admin, Supervisor |
| GET | /reports/scheduled/:id | Get schedule detail | Admin, Supervisor |
| PATCH | /reports/scheduled/:id | Update schedule | Admin, Supervisor |
| DELETE | /reports/scheduled/:id | Delete schedule | Admin |
| POST | /reports/scheduled/:id/run | Run now | Admin, Supervisor |

### Bulk Operations

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | /users/bulk-import | Import users from CSV | Admin |
| POST | /areas/bulk-import | Import areas from CSV | Admin |
| POST | /assets/bulk-import | Import assets from CSV | Admin |
| DELETE | /users/bulk-delete | Delete multiple users | Admin |
| GET | /users/export | Export users to CSV | Admin |
| GET | /areas/export | Export areas to CSV | Admin |
| GET | /assets/export | Export assets to CSV | Admin |

---

## Audit Interceptor

```typescript
// audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutating operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    const entityType = this.extractEntityType(request.path);
    const oldValue = request.auditOldValue; // Set by service if update

    return next.handle().pipe(
      tap((response) => {
        this.auditService.log({
          userId: user?.id,
          action: this.methodToAction(method),
          entityType,
          entityId: response?.id || request.params.id,
          entityName: response?.name || response?.fullName,
          oldValue,
          newValue: response,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
      }),
    );
  }

  private methodToAction(method: string): string {
    switch (method) {
      case 'POST': return 'create';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return 'unknown';
    }
  }

  private extractEntityType(path: string): string {
    const segments = path.split('/').filter(Boolean);
    return segments[1] || 'unknown'; // e.g., /api/users -> users
  }
}
```

---

## Email Service

```typescript
// shared/services/email.service.ts
@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: true,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get('SMTP_FROM'),
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
  }

  async sendReportEmail(
    recipients: string[],
    reportName: string,
    reportBuffer: Buffer,
    format: string,
  ): Promise<void> {
    await this.sendEmail({
      to: recipients.join(', '),
      subject: `SEKAR Report: ${reportName}`,
      html: this.generateReportEmailTemplate(reportName),
      attachments: [
        {
          filename: `${reportName}.${format}`,
          content: reportBuffer,
        },
      ],
    });
  }

  private generateReportEmailTemplate(reportName: string): string {
    return `
      <h2>SEKAR - Automated Report</h2>
      <p>Your scheduled report "${reportName}" is attached.</p>
      <p>Generated at: ${new Date().toLocaleString('id-ID')}</p>
      <hr/>
      <p><small>This is an automated email from SEKAR System.</small></p>
    `;
  }
}
```

---

## Report Scheduler Service

```typescript
// scheduler/report-scheduler.service.ts
@Injectable()
export class ReportSchedulerService implements OnModuleInit {
  private scheduledJobs: Map<string, ScheduledTask> = new Map();

  constructor(
    @InjectRepository(ScheduledReport)
    private scheduleRepository: Repository<ScheduledReport>,
    private reportsService: ReportsService,
    private emailService: EmailService,
  ) {}

  async onModuleInit() {
    await this.loadSchedules();
  }

  async loadSchedules() {
    const schedules = await this.scheduleRepository.find({
      where: { isActive: true },
    });

    for (const schedule of schedules) {
      this.scheduleJob(schedule);
    }
  }

  scheduleJob(schedule: ScheduledReport) {
    const job = cron.schedule(schedule.scheduleCron, async () => {
      await this.runSchedule(schedule.id);
    });

    this.scheduledJobs.set(schedule.id, job);
  }

  async runSchedule(scheduleId: string) {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule || !schedule.isActive) return;

    try {
      // Generate report
      const reportBuffer = await this.reportsService.generate({
        type: schedule.reportType,
        format: schedule.outputFormat,
        filters: schedule.filters,
        columns: schedule.columns,
      });

      // Send email
      await this.emailService.sendReportEmail(
        schedule.emailRecipients,
        schedule.name,
        reportBuffer,
        schedule.outputFormat,
      );

      // Update schedule status
      await this.scheduleRepository.update(scheduleId, {
        lastRunAt: new Date(),
        lastRunStatus: 'success',
        lastRunError: null,
        nextRunAt: this.calculateNextRun(schedule.scheduleCron),
      });
    } catch (error) {
      await this.scheduleRepository.update(scheduleId, {
        lastRunAt: new Date(),
        lastRunStatus: 'failed',
        lastRunError: error.message,
      });
    }
  }

  private calculateNextRun(cronExpression: string): Date {
    const interval = parser.parseExpression(cronExpression);
    return interval.next().toDate();
  }
}
```

---

## Bulk Import Service

```typescript
// users/services/bulk-import.service.ts
@Injectable()
export class BulkImportService {
  async importUsers(file: Express.Multer.File): Promise<ImportResult> {
    const results: ImportResult = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    const records = await this.parseCSV(file.buffer);
    results.total = records.length;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        await this.validateUserRecord(record);
        await this.usersService.create({
          username: record.username,
          fullName: record.full_name,
          phone: record.phone,
          role: record.role,
          password: record.password || this.generateTempPassword(),
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2, // +2 for header and 0-index
          field: error.field || 'unknown',
          message: error.message,
        });
      }
    }

    return results;
  }

  private async parseCSV(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(csvParser())
        .on('data', (data) => records.push(data))
        .on('end', () => resolve(records))
        .on('error', (error) => reject(error));
    });
  }

  private async validateUserRecord(record: any): Promise<void> {
    if (!record.username) {
      throw { field: 'username', message: 'Username is required' };
    }
    if (!record.full_name) {
      throw { field: 'full_name', message: 'Full name is required' };
    }
    if (!['Worker', 'Supervisor', 'Admin'].includes(record.role)) {
      throw { field: 'role', message: 'Invalid role' };
    }
    // Check for duplicate username
    const existing = await this.usersService.findByUsername(record.username);
    if (existing) {
      throw { field: 'username', message: 'Username already exists' };
    }
  }
}
```

---

## Implementation Checklist

### Day 1-2: Audit Module

- [ ] Create audit module
- [ ] AuditLog entity
- [ ] AuditService
- [ ] AuditInterceptor
- [ ] GET /audit-logs endpoint
- [ ] Filter by user, action, entity
- [ ] Filter by date range
- [ ] Diff calculation for changes
- [ ] Export audit logs
- [ ] Unit tests (>80%)

### Day 3: System Settings

- [ ] Create settings module
- [ ] SystemSetting entity
- [ ] SettingsService
- [ ] GET /settings endpoint
- [ ] PATCH /settings endpoint
- [ ] Default settings seeder
- [ ] Settings validation
- [ ] Unit tests

### Day 4-5: Report Scheduler

- [ ] ScheduledReport entity
- [ ] ReportSchedulerService
- [ ] Cron job management
- [ ] CRUD endpoints for schedules
- [ ] Run now endpoint
- [ ] Calculate next run time
- [ ] Handle failed jobs
- [ ] Unit tests

### Day 6: Email Service

- [ ] EmailService with nodemailer
- [ ] Email templates
- [ ] Report email with attachment
- [ ] Error notification emails
- [ ] Environment configuration
- [ ] Unit tests

### Day 7: Bulk Operations

- [ ] CSV parser integration
- [ ] BulkImportService
- [ ] User bulk import
- [ ] Area bulk import
- [ ] Asset bulk import
- [ ] Bulk delete endpoints
- [ ] Export endpoints (CSV)
- [ ] Validation and error reporting
- [ ] Unit tests

---

## Dependencies

```bash
npm install nodemailer
npm install @types/nodemailer --save-dev
npm install node-cron
npm install @types/node-cron --save-dev
npm install cron-parser
npm install csv-parser
npm install json2csv
```

---

## Environment Variables

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=sekar@DLH.surabaya.go.id
SMTP_PASS=your-app-password
SMTP_FROM="SEKAR System <sekar@DLH.surabaya.go.id>"
```

---

## Test Coverage Requirements

| Module | Target | Tests |
|--------|--------|-------|
| AuditService | >80% | Logging, queries |
| SettingsService | >80% | CRUD, validation |
| ReportSchedulerService | >80% | Scheduling, execution |
| EmailService | >80% | Sending, templates |
| BulkImportService | >80% | Parsing, validation |

---

## Success Criteria

1. All admin actions logged automatically
2. Audit logs searchable by user/action/date
3. System settings configurable via API
4. Scheduled reports execute on time
5. Email delivery successful
6. Bulk import validates data
7. Export generates valid CSV/Excel
8. >80% test coverage achieved

---

## WebSocket Implementation

### Real-Time Dashboard Updates

**Path:** `be/src/modules/realtime/`

```
realtime/
├── realtime.module.ts
├── realtime.gateway.ts
├── realtime.gateway.spec.ts
└── dto/
    └── subscribe.dto.ts
```

### WebSocket Gateway

```typescript
// realtime.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_DASHBOARD_URL,
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Socket> = new Map();

  async handleConnection(client: Socket) {
    const userId = await this.validateClient(client);
    if (!userId) {
      client.disconnect();
      return;
    }

    this.connectedClients.set(userId, client);
    console.log(`Client connected: ${userId}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.findUserIdByClient(client);
    if (userId) {
      this.connectedClients.delete(userId);
      console.log(`Client disconnected: ${userId}`);
    }
  }

  @SubscribeMessage('subscribe:active-workers')
  handleSubscribeActiveWorkers(client: Socket) {
    client.join('active-workers');
    return { event: 'subscribed', room: 'active-workers' };
  }

  @SubscribeMessage('subscribe:area-status')
  handleSubscribeAreaStatus(client: Socket, data: { areaId: string }) {
    client.join(`area:${data.areaId}`);
    return { event: 'subscribed', room: `area:${data.areaId}` };
  }

  // Called by services to broadcast updates
  broadcastActiveWorkerUpdate(data: any) {
    this.server.to('active-workers').emit('active-workers:update', data);
  }

  broadcastAreaUpdate(areaId: string, data: any) {
    this.server.to(`area:${areaId}`).emit('area-status:update', data);
  }

  broadcastNewReport(data: any) {
    this.server.emit('new-report', data);
  }
}
```

### Integration with Existing Services

```typescript
// Example: shifts.service.ts
@Injectable()
export class ShiftsService {
  constructor(private realtimeGateway: RealtimeGateway) {}

  async clockIn(userId: string, dto: ClockInDto): Promise<Shift> {
    const shift = await this.createShift(userId, dto);

    // Broadcast to WebSocket clients
    this.realtimeGateway.broadcastActiveWorkerUpdate({
      type: 'clock-in',
      worker: {
        id: userId,
        fullName: shift.worker.fullName,
      },
      shift: {
        id: shift.id,
        clockInTime: shift.clockInTime,
      },
    });

    return shift;
  }
}
```

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe:active-workers` | Client → Server | Subscribe to active worker updates |
| `active-workers:update` | Server → Client | Broadcast worker clock-in/out |
| `subscribe:area-status` | Client → Server | Subscribe to area status |
| `area-status:update` | Server → Client | Broadcast area status changes |
| `new-report` | Server → Client | Broadcast new work report |
| `new-task` | Server → Client | Broadcast new task assignment |
| `maintenance-due` | Server → Client | Alert maintenance due soon |

---

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing (>80% coverage)
- [ ] Integration tests for audit logging passing
- [ ] Test email delivery in staging
- [ ] Test scheduled reports execute correctly
- [ ] Test bulk import with sample CSV (1000+ rows)
- [ ] Test WebSocket connections (100+ concurrent)
- [ ] Database indexes for audit logs created
- [ ] SMTP credentials verified

### Environment Variables

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=sekar@dlh.surabaya.go.id
SMTP_PASS=your-app-password
SMTP_FROM="SEKAR System <sekar@dlh.surabaya.go.id>"

# Report Scheduler
ENABLE_SCHEDULED_REPORTS=true
SCHEDULER_TIMEZONE=Asia/Jakarta
REPORT_ERROR_EMAIL=admin@dlh.surabaya.go.id

# Audit Logging
AUDIT_LOG_RETENTION_DAYS=365
AUDIT_LOG_EXPORT_BUCKET=sekar-audit-logs

# WebSocket
WEB_DASHBOARD_URL=https://dashboard.sekar.dlh.surabaya.go.id
WEBSOCKET_PORT=3001
WEBSOCKET_PATH=/realtime
```

### Deployment Steps

1. **Database Migration**
   ```bash
   npm run migration:run
   # Creates audit_logs, system_settings, scheduled_reports tables
   ```

2. **Seed System Settings**
   ```bash
   npm run seed:system-settings
   # Default settings: maintenance windows, notification preferences
   ```

3. **Verify Endpoints**
   ```bash
   curl http://localhost:3000/api/audit-logs
   curl http://localhost:3000/api/settings
   curl http://localhost:3000/api/reports/scheduled
   ```

4. **Test Email Delivery**
   ```bash
   curl -X POST http://localhost:3000/api/test/send-email \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "admin@dlh.surabaya.go.id",
       "subject": "SEKAR Test Email",
       "body": "Testing email service"
     }'
   ```

5. **Test Bulk Import**
   ```bash
   curl -X POST http://localhost:3000/api/users/bulk-import \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -F "file=@users-import.csv"
   ```

6. **Test WebSocket Connection**
   ```bash
   # Use wscat or similar tool
   wscat -c ws://localhost:3001/realtime
   > {"event": "subscribe:active-workers"}
   ```

### Post-Deployment

- [ ] Verify audit logs being created for admin actions
- [ ] Verify scheduled reports execute at correct times
- [ ] Monitor email delivery rates
- [ ] Test bulk operations with large datasets
- [ ] Monitor WebSocket connection stability
- [ ] Set up CloudWatch alarms for failures
- [ ] Review audit log retention policy

### Rollback Plan

1. Disable scheduler: Set `ENABLE_SCHEDULED_REPORTS=false`
2. Disable WebSocket: Stop WebSocket server
3. Revert database migration: `npm run migration:revert`
4. Redeploy previous version
5. Restore backed-up audit logs if needed

---

## Bulk Operation Examples

### Bulk User Import

**CSV Format:**
```csv
username,full_name,role,password
worker4,Pekerja Empat,worker,worker123
worker5,Pekerja Lima,worker,worker123
supervisor2,Supervisor Dua,supervisor,supervisor123
```

**Request:**
```http
POST /api/users/bulk-import
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data

file: users.csv
```

**Response:**
```json
{
  "total": 3,
  "successful": 2,
  "failed": 1,
  "errors": [
    {
      "row": 3,
      "field": "username",
      "message": "Username 'worker4' already exists"
    }
  ],
  "created_user_ids": [
    "uuid-worker5",
    "uuid-supervisor2"
  ]
}
```

### Bulk User Export

**Request:**
```http
GET /api/users/export?format=csv&role=worker
Authorization: Bearer {admin_token}
```

**Response Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="users-export-2026-01-21.csv"
```

**Response Body (CSV):**
```csv
id,username,full_name,role,is_active,created_at
uuid-1,worker1,Pekerja Satu,worker,true,2026-01-09T10:00:00.000Z
uuid-2,worker2,Pekerja Dua,worker,true,2026-01-10T10:00:00.000Z
```

### Bulk Delete

**Request:**
```http
DELETE /api/users/bulk-delete
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "user_ids": [
    "uuid-worker4",
    "uuid-worker5"
  ],
  "reason": "Accounts no longer needed"
}
```

**Response:**
```json
{
  "deleted": 2,
  "failed": 0,
  "audit_log_id": "audit-uuid"
}
```

---

## API Response Examples

### GET /audit-logs

**Request:**
```http
GET /api/audit-logs?user_id=admin-uuid&action=delete&from_date=2026-01-01&to_date=2026-01-31&page=1&limit=20
Authorization: Bearer {admin_token}
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "audit-uuid",
      "user": {
        "id": "admin-uuid",
        "fullName": "Admin Satu"
      },
      "action": "delete",
      "entityType": "users",
      "entityId": "user-uuid",
      "entityName": "Worker Ten",
      "oldValue": {
        "username": "worker10",
        "full_name": "Worker Ten",
        "is_active": true
      },
      "newValue": {
        "is_active": false,
        "deleted_at": "2026-01-20T10:00:00.000Z"
      },
      "changedFields": ["is_active", "deleted_at"],
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-01-20T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 543,
    "totalPages": 28
  }
}
```

### GET /settings

**Response (200 OK):**
```json
{
  "settings": [
    {
      "key": "maintenance_window_start",
      "value": "22:00",
      "description": "Daily maintenance window start time (HH:MM)",
      "valueType": "string",
      "category": "system",
      "updatedBy": {
        "id": "admin-uuid",
        "fullName": "Admin Satu"
      },
      "updatedAt": "2026-01-15T10:00:00.000Z"
    },
    {
      "key": "max_shift_hours",
      "value": "12",
      "description": "Maximum shift duration in hours",
      "valueType": "number",
      "category": "shifts",
      "updatedAt": "2026-01-10T10:00:00.000Z"
    },
    {
      "key": "enable_notifications",
      "value": "true",
      "description": "Enable email notifications",
      "valueType": "boolean",
      "category": "notifications",
      "updatedAt": "2026-01-01T10:00:00.000Z"
    }
  ]
}
```

### POST /reports/scheduled (Create Scheduled Report)

**Request:**
```json
{
  "name": "Weekly Attendance Report",
  "reportType": "attendance",
  "outputFormat": "pdf",
  "scheduleCron": "0 8 * * MON",
  "scheduleDescription": "Every Monday at 8 AM",
  "emailRecipients": [
    "supervisor@dlh.surabaya.go.id",
    "admin@dlh.surabaya.go.id"
  ],
  "emailSubject": "SEKAR Weekly Attendance - Week {{week}}",
  "filters": {
    "date_range": "last_7_days"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "schedule-uuid",
  "name": "Weekly Attendance Report",
  "reportType": "attendance",
  "outputFormat": "pdf",
  "scheduleCron": "0 8 * * MON",
  "scheduleDescription": "Every Monday at 8 AM",
  "emailRecipients": [
    "supervisor@dlh.surabaya.go.id",
    "admin@dlh.surabaya.go.id"
  ],
  "emailSubject": "SEKAR Weekly Attendance - Week {{week}}",
  "isActive": true,
  "nextRunAt": "2026-01-27T08:00:00.000Z",
  "createdBy": {
    "id": "admin-uuid",
    "fullName": "Admin Satu"
  },
  "createdAt": "2026-01-21T10:00:00.000Z"
}
```

---

**Last Updated:** 2026-01-21
