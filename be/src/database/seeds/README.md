# Database Seeders

This directory contains database seeding scripts for the SEKAR project.

## Available Seeders

### 1. Main Seeder (`seed.ts`)

Seeds Phase 1 MVP data:
- Users (admin, supervisor1-2, worker1-3)
- Area Types (park, pedestrian, mini_garden, street)
- Areas (Taman Bungkul, Jalan Raya Darmo, Taman Harmoni)
- Worker Assignments
- Shifts
- Reports
- Location Logs

**Usage:**
```bash
npm run seed
```

### 2. Phase 2 Seeder (`seed-phase2.ts`)

Seeds Phase 2 Enhanced Features data:
- Rayons (7 geographic sectors)
- Shift Definitions (3 fixed shifts)
- Activity Types (10 work activities)
- Special Day Overrides (holidays)
- Additional Users (7 users with Phase 2 roles)
- Area Staff Requirements
- Worker Schedules

**Prerequisites:** Phase 1 data must be seeded first

**Usage:**
```bash
npm run seed:phase2
```

### 3. Task Seeder (`seed-tasks.ts`) ✨ NEW

Seeds dummy tasks for testing worker task list view in mobile app.

**What it creates:**
- 8 tasks with various statuses:
  - 2 PENDING tasks (not yet assigned)
  - 2 ASSIGNED tasks (assigned but not accepted)
  - 1 ACCEPTED task (accepted by worker)
  - 1 IN_PROGRESS task (currently being worked on)
  - 1 COMPLETED task (finished with completion notes)
  - 1 DECLINED task (rejected by worker)

**Features:**
- Works with or without Phase 2 data (activity_types optional)
- Automatically assigns tasks to existing workers
- Uses realistic deadlines (tomorrow, next week)
- Includes completion data for completed tasks
- Includes decline reason for declined tasks

**Prerequisites:** Phase 1 data must be seeded first (requires users and areas)

**Usage:**
```bash
npm run seed:tasks
```

**Test Users (from Phase 1):**
- `worker1` / `worker123` - Has ASSIGNED and COMPLETED tasks
- `worker2` / `worker123` - Has ACCEPTED and DECLINED tasks
- `worker3` / `worker123` - Has IN_PROGRESS and ASSIGNED tasks

## Typical Seeding Workflow

### For Development:

```bash
# 1. Seed Phase 1 MVP data
npm run seed

# 2. (Optional) Seed Phase 2 data if testing Phase 2 features
npm run seed:phase2

# 3. Seed tasks for testing task list view
npm run seed:tasks
```

### For Testing Tasks Only:

If you already have Phase 1 data and just want fresh tasks:

```bash
npm run seed:tasks
```

This will:
- Delete all existing tasks
- Create 8 new tasks with various statuses
- Preserve all other data (users, areas, etc.)

## Task Statuses

The task seeder creates tasks in all possible workflow states:

| Status | Description | Count | Example |
|--------|-------------|-------|---------|
| `pending` | Task created but not yet assigned | 2 | "Penyiraman Taman Pagi" |
| `assigned` | Task assigned to a worker but not accepted | 2 | "Penanaman Bunga Musiman" |
| `accepted` | Worker accepted the task | 1 | "Pemangkasan Pohon Tinggi" |
| `in_progress` | Worker is currently working on the task | 1 | "Pembersihan Area Playground" |
| `completed` | Task finished with completion data | 1 | "Penyiraman Taman Sore" |
| `declined` | Worker declined the task | 1 | "Pemangkasan Semak Belukar" |

## Testing the Mobile App

After seeding tasks:

1. **Login as worker1:**
   - Username: `worker1`
   - Password: `worker123`
   - You should see:
     - 1 ASSIGNED task in "Tugas Baru" section
     - 1 COMPLETED task in "Selesai" section

2. **Login as worker2:**
   - Username: `worker2`
   - Password: `worker123`
   - You should see:
     - 1 ACCEPTED task in "Diterima" section
     - 1 DECLINED task in history

3. **Login as worker3:**
   - Username: `worker3`
   - Password: `worker123`
   - You should see:
     - 1 IN_PROGRESS task in "Sedang Dikerjakan" section
     - 1 ASSIGNED task in "Tugas Baru" section

## Database Cleanup

To start fresh:

```bash
# Stop and remove database
cd infra
docker-compose down -v

# Start database again
docker-compose up -d

# Wait for database to be ready, then seed
cd ../be
npm run seed
npm run seed:phase2  # Optional
npm run seed:tasks   # For testing tasks
```

## Production Seeders

For production deployments, use the compiled JavaScript versions:

```bash
npm run seed:prod
npm run seed:phase2:prod
npm run seed:tasks:prod
```

These run from the `dist/` directory after building the project.

## Troubleshooting

### Error: "No users found"
**Solution:** Run `npm run seed` first to create Phase 1 users

### Error: "No areas found"
**Solution:** Run `npm run seed` first to create Phase 1 areas

### Warning: "No activity types found"
**Info:** This is normal if Phase 2 seeder hasn't been run. Tasks will be created without activity types.

### Error: "No koordinator_lapangan found"
**Solution:** The seeder automatically falls back to supervisor or admin. If you see this error, run `npm run seed` first.

## Notes

- All seeders use transaction-safe operations
- Tasks can be re-seeded multiple times (existing tasks are deleted)
- User passwords in seeder are **test passwords only** - never use in production
- Task seeder preserves all other data (users, areas, shifts, etc.)
- Timestamps use realistic time offsets (e.g., tasks created "1 hour ago")
