/**
 * Phase 3 sub-phase 3-14 — monitoring v2 load test (ADR-029).
 *
 * Simulates N concurrent satgas/linmas workers each pinging GPS once per
 * `PING_INTERVAL` seconds for `DURATION` minutes, plus a small pool of
 * monitoring-dashboard subscribers measuring WS broadcast latency.
 *
 * Pass thresholds (see specs/phases/phase-3-plants-monitoring-rebuild/infrastructure.md):
 *   - p95 ingest      < 200 ms
 *   - p95 ws_latency  < 500 ms
 *   - check rate      > 0.999
 *
 * Run:
 *   k6 run \
 *     -e API=http://localhost:3000 \
 *     -e WORKER_COUNT=500 \
 *     -e PING_INTERVAL=12 \
 *     -e DURATION=30m \
 *     -e WORKER_PREFIX=satgas \
 *     -e WORKER_PASSWORD=password123 \
 *     -e ADMIN_USERNAME=admin \
 *     -e ADMIN_PASSWORD=password123 \
 *     infra/loadtest/monitoring-500w.js
 *
 * Notes:
 *   - setup() logs in `WORKER_COUNT` users named `${WORKER_PREFIX}1..N`,
 *     clocks each in (creating a shift), and returns {token, shift_id}
 *     tuples. The seed must include at least N matching users; reduce
 *     WORKER_COUNT for smaller environments.
 *   - The default scenario is a constant-VU pinger; a second 5-VU
 *     scenario subscribes to the WS gateway and records msg arrival
 *     latency to measure the broadcast pipeline.
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const API = __ENV.API || 'http://localhost:3000';
const WORKER_COUNT = parseInt(__ENV.WORKER_COUNT || '500', 10);
const PING_INTERVAL = parseInt(__ENV.PING_INTERVAL || '12', 10);
const DURATION = __ENV.DURATION || '30m';
const WORKER_PREFIX = __ENV.WORKER_PREFIX || 'satgas';
const WORKER_PASSWORD = __ENV.WORKER_PASSWORD || 'password123';
const ADMIN_USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'password123';

const wsLatency = new Trend('ws_broadcast_latency_ms', true);

export const options = {
  scenarios: {
    pinging: {
      executor: 'constant-vus',
      vus: WORKER_COUNT,
      duration: DURATION,
      exec: 'pingLocation',
      tags: { scenario: 'pinging' },
    },
    monitoring: {
      executor: 'constant-vus',
      vus: 5,
      duration: DURATION,
      exec: 'subscribeMonitoring',
      tags: { scenario: 'monitoring' },
    },
  },
  thresholds: {
    'http_req_duration{type:ingest}': ['p(95)<200'],
    ws_broadcast_latency_ms: ['p(95)<500'],
    checks: ['rate>0.999'],
  },
};

function login(identifier, password) {
  const res = http.post(
    `${API}/api/v1/auth/login`,
    JSON.stringify({ identifier, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { type: 'login' } },
  );
  if (res.status !== 200 && res.status !== 201) return null;
  try {
    return JSON.parse(res.body).access_token;
  } catch {
    return null;
  }
}

function clockIn(token) {
  const res = http.post(
    `${API}/api/v1/shifts/clock-in`,
    JSON.stringify({
      gps_lat: -7.2905 + (Math.random() - 0.5) * 0.01,
      gps_lng: 112.7398 + (Math.random() - 0.5) * 0.01,
    }),
    {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      tags: { type: 'clock-in' },
    },
  );
  if (res.status !== 200 && res.status !== 201) return null;
  try {
    const body = JSON.parse(res.body);
    return body.id || body.shift?.id || null;
  } catch {
    return null;
  }
}

export function setup() {
  console.log(`[setup] logging in & clocking in ${WORKER_COUNT} workers…`);
  const workers = [];
  for (let i = 1; i <= WORKER_COUNT; i++) {
    const token = login(`${WORKER_PREFIX}${i}`, WORKER_PASSWORD);
    if (!token) {
      console.warn(`[setup] worker ${i} login failed — skipping`);
      continue;
    }
    const shiftId = clockIn(token);
    if (!shiftId) {
      console.warn(`[setup] worker ${i} clock-in failed — skipping`);
      continue;
    }
    workers.push({ token, shift_id: shiftId });
  }
  const adminToken = login(ADMIN_USERNAME, ADMIN_PASSWORD);
  console.log(`[setup] ${workers.length}/${WORKER_COUNT} workers ready, admin=${!!adminToken}`);
  return { workers, adminToken };
}

export function pingLocation(data) {
  const idx = (__VU - 1) % data.workers.length;
  const worker = data.workers[idx];
  if (!worker) {
    sleep(PING_INTERVAL);
    return;
  }

  const now = new Date().toISOString();
  const payload = JSON.stringify({
    shift_id: worker.shift_id,
    locations: [
      {
        gps_lat: -7.2905 + (Math.random() - 0.5) * 0.02,
        gps_lng: 112.7398 + (Math.random() - 0.5) * 0.02,
        accuracy_meters: 10 + Math.random() * 10,
        battery_level: 50 + Math.floor(Math.random() * 50),
        logged_at: now,
      },
    ],
  });

  const res = http.post(`${API}/api/v1/location/batch`, payload, {
    headers: {
      Authorization: `Bearer ${worker.token}`,
      'Content-Type': 'application/json',
    },
    tags: { type: 'ingest' },
  });

  check(res, { 'ingest 2xx': (r) => r.status >= 200 && r.status < 300 });
  sleep(PING_INTERVAL);
}

export function subscribeMonitoring(data) {
  if (!data.adminToken) {
    sleep(5);
    return;
  }
  const url = `${API.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket&token=${data.adminToken}`;
  const res = ws.connect(url, {}, function (socket) {
    socket.on('message', (msg) => {
      // Socket.IO frames carry our payload after the engine.io prefix; we
      // only care about messages that include a server-side timestamp so
      // we can compute broadcast latency. Best-effort parse.
      const idx = msg.indexOf('{');
      if (idx === -1) return;
      try {
        const obj = JSON.parse(msg.slice(idx));
        const t =
          obj.broadcastedAt ||
          obj.broadcasted_at ||
          obj.serverTime ||
          obj.timestamp ||
          (obj.payload && obj.payload.broadcasted_at);
        if (t) {
          const sent = new Date(t).getTime();
          if (!Number.isNaN(sent)) wsLatency.add(Date.now() - sent);
        }
      } catch {
        /* non-JSON keep-alive frames */
      }
    });

    socket.setTimeout(() => socket.close(), 60000);
  });
  check(res, { 'ws handshake 101': (r) => r && r.status === 101 });
  sleep(5);
}

export function teardown(data) {
  console.log(`[teardown] clocking out ${data.workers.length} workers…`);
  for (const w of data.workers) {
    http.post(
      `${API}/api/v1/shifts/clock-out`,
      JSON.stringify({
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        photo_url: 'https://placehold.co/400',
      }),
      {
        headers: { Authorization: `Bearer ${w.token}`, 'Content-Type': 'application/json' },
        tags: { type: 'clock-out' },
      },
    );
  }
}
