---
title: Real-Time Team Monitoring
sidebar_position: 1
---

# Real-Time Team Monitoring

Complete guide for Korlap (field coordinators) to monitor team positions and attendance on a live map.

## What is Monitoring?

**Monitoring** is a feature to view your team's position in real-time on a map. As Korlap, you can:

- **View Real-Time Positions** — See the location of each satgas/linmas on the map
- **Monitor Attendance** — Check who has clocked in/out
- **View Location History** — Track satgas travel routes throughout the day
- **Analyze Work Coverage** — See which areas have been covered

---

## Opening Monitoring

### Method 1: From Menu

1. Open the **Menu** tab (☰)
2. Tap **"Monitoring"**
3. The live map will open

### Method 2: From Home

1. Open the **Home** tab
2. Scroll to the **"Team Monitoring"** section
3. Tap to open the live map

---

## Monitoring View

### Live Map

```
┌─────────────────────────────────┐
│ [🔍] Search Area  [⚙️] Filter   │ ← Header
├─────────────────────────────────┤
│                                 │
│  ╔═══════════════════════════╗  │
│  ║                           ║  │
│  ║   [Map with Markers]      ║  │
│  ║                           ║  │
│  ║  🟢 Ahmad (Satgas)        ║  │
│  ║     Taman Bungkul         ║  │
│  ║     07:15 ONLINE          ║  │
│  ║                           ║  │
│  ║  🔵 Budi (Satgas)         ║  │
│  ║     Parking Area          ║  │
│  ║     OFFLINE               ║  │
│  ║                           ║  │
│  ║  🔴 (Offline: 5 people)  ║  │
│  ║                           ║  │
│  ╚═══════════════════════════╝  │
│                                 │
│ [Show List]   [Apply] │
└─────────────────────────────────┘
```

### Map Elements

**Markers:**
- 🟢 **Green** — Worker online, logged in and working
- 🔵 **Blue** — Worker on break/inactive
- 🔴 **Red** — Worker offline or not logged in

**Information per Marker:**
- Worker name
- Role (Satgas, Linmas)
- Current location or area
- Connection status (ONLINE/OFFLINE)

---

## Filters & Search

### Monitoring Filters

On the map header, there are several filters:

**1. Status Filter:**
- Online — Show only online workers
- Offline — Show only offline workers
- All — Show everyone

**2. Area Filter:**
- Taman Bungkul
- Parking Area
- Other areas in your rayon

**3. Role Filter:**
- Satgas — Show satgas only
- Linmas — Show linmas only
- All — All roles

### Searching for Workers

1. Tap the **[🔍] Search** button above the map
2. Type worker's name
3. The searched worker will be highlighted on the map
4. The map will zoom to the worker's location

---

## Viewing Worker Details

### Tap Marker for Details

1. Tap **a marker** (worker dot) on the map
2. The worker's detail card will appear

### Detail Information

```
┌─────────────────────────────────┐
│ AHMAD RIZKI                     │
│ Satgas                          │
├─────────────────────────────────┤
│ STATUS: 🟢 ONLINE              │
│                                 │
│ CURRENT LOCATION                │
│ Taman Bungkul                   │
│ Latitude: -7.295479             │
│ Longitude: 112.762227           │
│ Accuracy: ±8m                   │
│                                 │
│ TODAY'S SHIFT                   │
│ Shift 1 (06:00 - 14:00)        │
│                                 │
│ ATTENDANCE                      │
│ In: 06:15 ✓ (on time)          │
│ Out: — (not yet out)           │
│                                 │
│ [VIEW HISTORY]  [CONTACT]      │
└─────────────────────────────────┘
```

**Information Displayed:**
- Name, role, connection status
- Current GPS location with accuracy
- Today's shift
- Attendance status (in/out)
- Last location update time

---

## Worker Location History

### Viewing Travel Routes

1. From the worker's detail card, tap **"[VIEW HISTORY]"** or **"Location History"**
2. The map will show the travel route

### History View

```
Travel Route: Ahmad Rizki (24 June 2026)

[Map with route lines]

▲ 06:15 — Clocked in at Taman Bungkul
▬ 06:30 — Moving to Playground Area
● 06:45 — Stopped at Playground Area (10 minutes)
● 07:00 — Took report photo
▬ 07:15 — Moving to Tree Area
● 07:30 — Stopped at Tree Area (45 minutes)
● 08:15 — Took report photo
▬ 08:30 — Returning to Gate
```

**History Information:**
- Route line shows travel path
- Key points (stops, reports, attendance)
- Time and duration at each location
- Link to report if photos available

:::note
Location history is useful for:
- Verifying work coverage
- Checking if worker completed assigned area
- Understanding work patterns
:::

---

## Attendance & Today's Shift

### Team Attendance Summary

On the Monitoring page, there's an attendance summary section:

```
ATTENDANCE TODAY (24 June 2026)

Shift 1 (06:00 - 14:00)
✓ Clocked In: 8 / 10 people
⏰ Late: 2 people
⏱️ Not Clocked In: 0 people

Shift 2 (14:00 - 22:00)
✓ Clocked In: 7 / 10 people
⏰ Late: 1 person
⏱️ Not Clocked In: 2 people

Shift 3 (22:00 - 06:00)
✓ Clocked In: 5 / 6 people
⏰ Late: 0 people
⏱️ Not Clocked In: 1 person
```

This helps you quickly see attendance overview before checking individual details.

---

## Work Areas & Boundaries

### Viewing Area Boundaries

The Monitoring map displays:

- **Boundary Lines** — Work area limits (drawn as polygon lines)
- **Area Names** — Area names displayed
- **Area Colors** — Different colors for different areas

### Verifying Work Coverage

By looking at location history & boundaries:

1. Check if satgas travel route covers the assigned area
2. Identify uncovered areas
3. View report photos to verify work

:::tip
**Pro Tip:** Compare location history with activity reports. Covered areas should have report photos.
:::

---

## Communication from Monitoring

### Contact Satgas Directly

From the worker's detail card, you can:

1. Tap the **"[CONTACT]"** button
2. Choose a communication method:
   - **Chat** — Send text message
   - **Call** — Call directly
   - **Send Notification** — Push notification to worker

### Send Urgent Notification

For quick communication:

1. Tap worker on map
2. Tap **"Send Notification"** or **"Send Alert"**
3. Type your message (example: "Ahmad, finish playground area first")
4. Worker will receive push notification

---

## Export Monitoring Data

### Download Monitoring Report

Some rayons have export features:

1. On the Monitoring page, look for **"Export"** or **"Report"** button
2. Choose format:
   - **PDF** — For printing/official reports
   - **Excel** — For further analysis
3. Select date range to export
4. Tap **"Download"**
5. File will be saved to your device

---

## Offline Monitoring

### Monitoring While Offline

If the app/dashboard is offline:

- The map will display **last saved data** stored locally
- Positions will be a **last snapshot**, not real-time
- Status will update automatically when connection returns

Ensure stable connection when doing critical monitoring.

---

## Troubleshooting Monitoring

### "Worker Markers Not Showing on Map"

**Causes:**
- Worker hasn't clocked in yet
- Worker offline and GPS not recording
- Connection problem

**Solutions:**
1. Check if worker has clocked in
2. Contact worker to check GPS status
3. Refresh map or restart app
4. Ensure stable internet connection

### "Position Not Updating (Stuck at Old Location)"

**Causes:**
- Worker's internet connection is down
- GPS inaccurate in covered areas
- App frozen on worker's device

**Solutions:**
1. Contact worker to check connection
2. Ask worker to restart app
3. Wait a few minutes, usually updates automatically

### "Can't View Location History"

**Causes:**
- History data not saved yet
- Internet disconnected while loading

**Solutions:**
1. Ensure internet connection is active
2. Wait a moment
3. Refresh page
4. Contact admin if issue persists

---

## Tips for Effective Monitoring

:::tip
**1. Monitor Regularly**
- Check map 2-3 times per shift
- Identify uncovered areas

**2. Verify with Reports**
- Compare location history with activity reports
- Ensure all areas have documentation

**3. Proactive Communication**
- If worker offline for long, contact directly
- If area uncovered, reassign task

**4. Analyze Work Patterns**
- View location history to understand worker efficiency
- Identify problem areas (frequently worked but damaged again)

**5. Export & Report**
- Export monitoring data periodically for rayon head reports
- Use for performance analysis and evaluation
:::

---

**Need monitoring help?** See [FAQ & Help](../faq.md) or contact your admin.
