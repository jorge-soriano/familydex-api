import { Request, Response, NextFunction } from 'express';
import { securityLog } from '../config/logger';

/**
 * Role guards — applied after authenticate().
 * OWASP A01: Broken Access Control
 * Any role mismatch is logged as a security event for audit purposes.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    securityLog.accessForbidden(req.user?.userId, req.path);
    res.status(403).json({ message: 'Acceso denegado: se requiere rol admin' });
    return;
  }
  next();
}

export function requireChild(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'child') {
    securityLog.accessForbidden(req.user?.userId, req.path);
    res.status(403).json({ message: 'Acceso denegado: se requiere rol child' });
    return;
  }
  next();
}

/**
 * Utility for service-layer family isolation checks.
 * Called by services (e.g. economyService.assertChildInFamily) when a cross-family
 * access attempt is detected. Separated here so logs are centralised.
 */
export function logFamilyViolation(userId?: number, familyId?: string, endpoint?: string): void {
  securityLog.familyViolation(userId, familyId, endpoint);
}
