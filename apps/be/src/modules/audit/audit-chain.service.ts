import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** Rows chained per sealing pass; the next minute picks up any remainder. */
export const SEAL_BATCH = 5000;

/** Arbitrary constant key so only one instance seals at a time. */
const SEAL_LOCK_KEY = 61_000_001;

export interface ChainStatus {
  /** Rows whose hash links verified. */
  sealed: number;
  /** Rows written but not yet chained (≤ one sealing interval old). */
  unsealed: number;
  /** Row where the chain first breaks, or null when intact. */
  first_broken_seq: string | null;
  /** Head of the chain — logged each pass as an external anchor. */
  last_hash: string | null;
  intact: boolean;
}

/**
 * Seals audit_logs into a SHA-256 hash chain (ADR-061). Sealing is out-of-band
 * so audited writes never serialise on a global lock. Each pass logs the chain
 * head to the application log (shipped off-box), which anchors the chain: a
 * truncated tail can be detected by comparing against the last anchor.
 */
@Injectable()
export class AuditChainService {
  private readonly logger = new Logger(AuditChainService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'audit-seal' })
  async sealPending(): Promise<number> {
    try {
      const sealed = await this.dataSource.transaction(async (manager) => {
        const [{ locked }] = (await manager.query(
          `SELECT pg_try_advisory_xact_lock($1) AS locked`,
          [SEAL_LOCK_KEY],
        )) as Array<{ locked: boolean }>;
        if (!locked) return 0; // another instance is sealing
        const [{ n }] = (await manager.query(`SELECT audit_seal($1) AS n`, [SEAL_BATCH])) as Array<{
          n: number;
        }>;
        return n;
      });
      if (sealed > 0) {
        const [head] = (await this.dataSource.query(
          `SELECT chain_pos, hash FROM audit_logs WHERE hash IS NOT NULL ORDER BY chain_pos DESC LIMIT 1`,
        )) as Array<{ chain_pos: string; hash: string }>;
        this.logger.log(
          `audit chain sealed ${sealed} row(s); head #${head?.chain_pos} ${head?.hash}`,
        );
      }
      return sealed;
    } catch (error) {
      // Never throw from a cron; unsealed rows are retried next minute.
      this.logger.error(`audit sealing failed: ${(error as Error).message}`);
      return 0;
    }
  }

  /** Walk the whole chain. O(rows) — an on-demand integrity check, not a hot path. */
  async verify(): Promise<ChainStatus> {
    const [row] = (await this.dataSource.query(`SELECT * FROM audit_verify()`)) as Array<{
      sealed: string;
      unsealed: string;
      first_broken_seq: string | null;
      last_hash: string | null;
    }>;
    return {
      sealed: Number(row.sealed),
      unsealed: Number(row.unsealed),
      first_broken_seq: row.first_broken_seq,
      last_hash: row.last_hash,
      intact: row.first_broken_seq === null,
    };
  }
}
