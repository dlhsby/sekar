/**
 * ConnectivityStatus — three-state connectivity model (ADR-019, Phase 4-2 M2)
 *
 * Differentiates "no internet" from "internet up but our server is sick".
 * Without this, a backend outage looks identical to airplane mode in the UI,
 * and users mash retry buttons that won't help.
 *
 * State transitions:
 *   ONLINE                — NetInfo says connected AND last /health/ready was ok.
 *   NO_INTERNET           — NetInfo reports disconnected.
 *   SERVER_UNREACHABLE    — NetInfo connected, but /health/ready failed (timeout
 *                            or non-2xx).
 *
 * Poll cadence:
 *   - SERVER_UNREACHABLE → poll every 30 s until recovery.
 *   - ONLINE             → passive heartbeat every 5 min.
 *   - NO_INTERNET        → idle; resume on NetInfo recovery event.
 */

import NetInfo, { type NetInfoSubscription } from '@react-native-community/netinfo';

export type ConnectivityStatus = 'ONLINE' | 'NO_INTERNET' | 'SERVER_UNREACHABLE';

export interface ConnectivityStatusSnapshot {
  status: ConnectivityStatus;
  lastHealthCheckAt: number | null;
  lastHealthError?: string;
}

export type ConnectivityListener = (snapshot: ConnectivityStatusSnapshot) => void;

interface ConnectivityMonitorOptions {
  healthUrl: string;
  /** Override fetch — primarily for tests. */
  fetchFn?: typeof fetch;
  unreachablePollMs?: number;
  heartbeatPollMs?: number;
  healthTimeoutMs?: number;
}

const DEFAULTS = {
  unreachablePollMs: 30_000,
  heartbeatPollMs: 5 * 60_000,
  healthTimeoutMs: 5_000,
};

export class ConnectivityMonitor {
  private status: ConnectivityStatus = 'ONLINE';
  private lastHealthCheckAt: number | null = null;
  private lastHealthError: string | undefined;
  private listeners: ConnectivityListener[] = [];
  private netInfoUnsubscribe: NetInfoSubscription | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly opts: Required<ConnectivityMonitorOptions>;

  constructor(opts: ConnectivityMonitorOptions) {
    this.opts = {
      ...DEFAULTS,
      fetchFn: opts.fetchFn ?? (globalThis.fetch as typeof fetch),
      ...opts,
    };
  }

  /** Start watching. Idempotent. */
  start(): void {
    if (this.netInfoUnsubscribe) return;
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      void this.evaluate(state.isConnected ?? false);
    });
    void this.evaluate(true);
  }

  /** Stop watching and tear down timers. Idempotent. */
  stop(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  subscribe(listener: ConnectivityListener): () => void {
    this.listeners.push(listener);
    listener(this.snapshot());
    return () => {
      const i = this.listeners.indexOf(listener);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  snapshot(): ConnectivityStatusSnapshot {
    return {
      status: this.status,
      lastHealthCheckAt: this.lastHealthCheckAt,
      lastHealthError: this.lastHealthError,
    };
  }

  /** Force a re-evaluation. Useful when the user taps "Try again". */
  async refresh(): Promise<void> {
    await this.evaluate(true);
  }

  private async evaluate(netInfoConnected: boolean): Promise<void> {
    if (!netInfoConnected) {
      this.setStatus('NO_INTERNET');
      this.schedulePoll();
      return;
    }

    const reachable = await this.checkHealth();
    this.setStatus(reachable ? 'ONLINE' : 'SERVER_UNREACHABLE');
    this.schedulePoll();
  }

  private async checkHealth(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.healthTimeoutMs);
    try {
      const res = await this.opts.fetchFn(this.opts.healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      this.lastHealthCheckAt = Date.now();
      if (!res.ok) {
        this.lastHealthError = `health ${res.status}`;
        return false;
      }
      const body = (await res.json().catch(() => null)) as { status?: string } | null;
      const ok = body?.status === 'ok';
      this.lastHealthError = ok ? undefined : `degraded`;
      return ok;
    } catch (err) {
      this.lastHealthCheckAt = Date.now();
      this.lastHealthError = (err as Error).message;
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  private setStatus(next: ConnectivityStatus): void {
    if (next === this.status) return;
    this.status = next;
    const snap = this.snapshot();
    this.listeners.forEach((l) => {
      try {
        l(snap);
      } catch (err) {
        // Listener errors must not blow up the monitor.
        console.warn('[ConnectivityMonitor] listener threw:', err);
      }
    });
  }

  private schedulePoll(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    const delay =
      this.status === 'SERVER_UNREACHABLE'
        ? this.opts.unreachablePollMs
        : this.status === 'ONLINE'
          ? this.opts.heartbeatPollMs
          : null; // NO_INTERNET: NetInfo wakes us
    if (delay == null) return;
    this.pollTimer = setTimeout(() => {
      void this.evaluate(true);
    }, delay);
  }
}
