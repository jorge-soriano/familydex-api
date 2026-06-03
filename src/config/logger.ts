/**
 * Security event logger — OWASP A09 (Security Logging and Monitoring Failures)
 *
 * Emits structured JSON to stdout so the output can be piped to any log
 * aggregator (CloudWatch, Datadog, Loki, …) without changing app code.
 *
 * Events are prefixed to make them grep-able:
 *   AUTH_*    → authentication / authorisation
 *   ACCESS_*  → access control
 *   RATE_*    → rate limiting
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface SecurityEvent {
  event: string;
  ip?: string;
  userId?: number;
  familyId?: string;
  endpoint?: string;
  detail?: string;
}

function emit(level: LogLevel, payload: SecurityEvent): void {
  const entry = { ts: new Date().toISOString(), level, ...payload };
  const line = JSON.stringify(entry);
  // Use appropriate stream so log aggregators can separate levels
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN')  console.warn(line);
  else                        console.info(line);
}

export const securityLog = {
  /** Successful login — record for anomaly detection */
  loginSuccess(userId: number, ip?: string): void {
    emit('INFO', { event: 'AUTH_LOGIN_SUCCESS', userId, ip });
  },

  /** Failed login attempt — high frequency = brute-force indicator */
  loginFailed(identifier: string, ip?: string): void {
    emit('WARN', { event: 'AUTH_LOGIN_FAILED', detail: identifier, ip });
  },

  /** JWT missing from request */
  tokenMissing(ip?: string, endpoint?: string): void {
    emit('WARN', { event: 'AUTH_TOKEN_MISSING', ip, endpoint });
  },

  /** JWT present but invalid or expired */
  tokenInvalid(ip?: string, endpoint?: string): void {
    emit('WARN', { event: 'AUTH_TOKEN_INVALID', ip, endpoint });
  },

  /** Role check failed (e.g. child trying admin endpoint) */
  accessForbidden(userId?: number, endpoint?: string): void {
    emit('WARN', { event: 'ACCESS_FORBIDDEN', userId, endpoint });
  },

  /** Family isolation violation — critical: cross-family data access attempt */
  familyViolation(userId?: number, familyId?: string, endpoint?: string): void {
    emit('ERROR', { event: 'ACCESS_FAMILY_ISOLATION_VIOLATION', userId, familyId, endpoint });
  },

  /** Rate limit exceeded on an endpoint */
  rateLimited(ip?: string, endpoint?: string): void {
    emit('WARN', { event: 'RATE_LIMIT_EXCEEDED', ip, endpoint });
  },

  /** Admin action on a child's data (audit trail) */
  adminAction(event: string, adminId: number, targetChildId: number): void {
    emit('INFO', { event: `ADMIN_${event}`, userId: adminId, detail: `child:${targetChildId}` });
  },
};
