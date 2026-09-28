import { Injectable, Logger } from '@nestjs/common';
import { auditContext } from '../../common/context/audit-context';
import { storeFrom } from '../../common/interceptors/audit-context.interceptor';
import { AuditLogService } from './audit.service';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PATH_MAX = 200;

interface GuardRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  route?: { path?: string };
  user?: { id?: string; role?: string; full_name?: string };
  ip?: string;
  requestId?: string;
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Records refused WRITE attempts (403 from RolesGuard/PermissionsGuard) as
 * `outcome: 'denied'` audit rows — ISO/IEC 27001 A.8.15 expects failed access
 * attempts to be logged, and a burst of them is the signal of a misconfigured
 * role or a probing account. Reads are not recorded (noise, and a refused read
 * changes nothing). Fire-and-forget: logging must never change the response.
 */
@Injectable()
export class DeniedAccessRecorder {
  private readonly logger = new Logger(DeniedAccessRecorder.name);

  constructor(private readonly auditLog: AuditLogService) {}

  record(req: GuardRequest | undefined, required: readonly string[]): void {
    const method = (req?.method ?? '').toUpperCase();
    if (!req?.user?.id || READ_METHODS.has(method)) return;
    const path = (req.route?.path ?? req.originalUrl ?? req.url ?? '')
      .split('?')[0]
      .slice(0, PATH_MAX);

    auditContext
      .run(storeFrom(req), () =>
        this.auditLog.log({
          entity_type: 'http',
          action: 'denied_write',
          outcome: 'denied',
          metadata: { method, path, required: [...required] },
        }),
      )
      .catch((err: Error) => this.logger.warn(`denied-access audit failed: ${err.message}`));
  }
}
