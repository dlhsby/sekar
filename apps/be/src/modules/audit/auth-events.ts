import { auditContext } from '../../common/context/audit-context';
import type { AuditLogService } from './audit.service';

export type AuthEvent = 'login' | 'login_failed' | 'logout';

interface AuthSubject {
  id: string;
  role?: string;
  full_name?: string;
  username?: string;
}

const IDENTIFIER_MAX = 50;

/**
 * Mask a login identifier for the audit trail (UU PDP data minimisation):
 * usernames are kept (needed to spot credential stuffing against one account),
 * phone numbers keep only their last 3 digits.
 */
export function maskIdentifier(identifier: string): string {
  const trimmed = identifier.trim().slice(0, IDENTIFIER_MAX);
  const digits = trimmed.replace(/\D/g, '');
  const looksLikePhone = /^[+\d][\d\s-]{6,}$/.test(trimmed) && digits.length >= 7;
  return looksLikePhone ? `${'*'.repeat(digits.length - 3)}${digits.slice(-3)}` : trimmed;
}

/**
 * Record an authentication event (ISO/IEC 27001 A.8.15 / A.5.15). The actor is
 * the authenticated (or attempted) account, not the anonymous request — so the
 * context is re-seeded with it. Best-effort: authentication must never fail
 * because audit logging did.
 */
export async function recordAuthEvent(
  auditLog: AuditLogService | undefined,
  event: AuthEvent,
  subject: AuthSubject | null,
  details: { identifier?: string; reason?: string } = {},
): Promise<void> {
  if (!auditLog) return;
  const ctx = auditContext.get();
  // A failed attempt was NOT made by the targeted account — only by whoever
  // typed its identifier — so it has no actor; the account is the entity.
  const authenticated = subject && event !== 'login_failed';
  const store = authenticated
    ? { ...ctx, userId: subject.id, role: subject.role, name: subject.full_name }
    : { ...ctx, userId: undefined, role: undefined, name: undefined };
  try {
    await auditContext.run(store, () =>
      auditLog.log({
        entity_type: 'auth',
        entity_id: subject?.id ?? null,
        entity_label: subject?.username ?? null,
        action: event,
        outcome: event === 'login_failed' ? 'failed' : 'success',
        metadata: {
          ...(details.identifier ? { identifier: maskIdentifier(details.identifier) } : {}),
          ...(details.reason ? { reason: details.reason } : {}),
        },
      }),
    );
  } catch {
    // Non-fatal by design.
  }
}
