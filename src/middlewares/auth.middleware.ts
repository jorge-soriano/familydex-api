import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { securityLog } from '../config/logger';

export interface JwtPayload {
  userId: number;
  role: 'admin' | 'child';
  familyId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    // OWASP A09: log missing tokens (helps detect misconfigured clients or probing)
    securityLog.tokenMissing(req.ip, req.path);
    res.status(401).json({ message: 'Token requerido' });
    return;
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, jwtConfig.secret) as JwtPayload;
    next();
  } catch {
    // OWASP A09: log invalid/expired tokens
    securityLog.tokenInvalid(req.ip, req.path);
    res.status(401).json({ message: 'Token inválido' });
  }
}
