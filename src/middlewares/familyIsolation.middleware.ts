import { Request, Response, NextFunction } from 'express';

// Role guards — applied after authenticate()
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Acceso denegado: se requiere rol admin' });
    return;
  }
  next();
}

export function requireChild(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'child') {
    res.status(403).json({ message: 'Acceso denegado: se requiere rol child' });
    return;
  }
  next();
}

// verifyFamilyId is added per-route once models are in place.
// It queries the target resource and verifies its familyId matches req.user.familyId,
// returning 403 on mismatch to enforce family isolation.
