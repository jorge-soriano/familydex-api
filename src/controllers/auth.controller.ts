import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { User } from '../models/user.model';
import { ChildProfile } from '../models/childProfile.model';

// OWASP A03: Input validation — length limits prevent oversized payloads
// bypassing DB-level constraints and help detect injection probing.
function validateRegister(body: Record<string, unknown>): string | null {
  const { email, password, confirmPassword, username } = body;
  if (!email || !password || !username)
    return 'Faltan campos obligatorios';
  if (String(email).length > 254)
    return 'El email es demasiado largo';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)))
    return 'Formato de email inválido';
  if (String(username).length > 50)
    return 'El nombre de usuario no puede superar 50 caracteres';
  if (
    String(password).length < 8 ||
    !/[A-Z]/.test(String(password)) ||
    !/\d/.test(String(password))
  )
    return 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número';
  if (String(password).length > 128)
    return 'La contraseña no puede superar 128 caracteres';
  if (password !== confirmPassword)
    return 'Las contraseñas no coinciden';
  return null;
}

function validateCreateChild(body: Record<string, unknown>): string | null {
  const { username, password, displayName } = body;
  if (!username || !password || !displayName)
    return 'Faltan campos obligatorios';
  if (String(displayName).length < 2)
    return 'El nombre debe tener al menos 2 caracteres';
  if (String(displayName).length > 100)
    return 'El nombre no puede superar 100 caracteres';
  if (/\s/.test(String(username)))
    return 'El nombre de usuario no puede contener espacios';
  if (String(username).length > 50)
    return 'El nombre de usuario no puede superar 50 caracteres';
  return null;
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const error = validateRegister(req.body);
      if (error) { res.status(400).json({ message: error }); return; }

      const token = await authService.registerAdmin(req.body);
      res.status(201).json({ token });
    } catch (err) {
      next(err);
    }
  },

  async createChild(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const error = validateCreateChild(req.body);
      if (error) { res.status(400).json({ message: error }); return; }

      const child = await authService.createChild(req.body, req.user!.familyId);
      res.status(201).json(child);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        res.status(400).json({ message: 'Faltan campos obligatorios' });
        return;
      }
      const token = await authService.login({ identifier, password });
      res.status(200).json({ token });
    } catch (err) {
      next(err);
    }
  },

  // HU-04: logout es solo cliente; el servidor confirma la recepción
  logout(_req: Request, res: Response): void {
    res.status(200).json({ message: 'Sesión cerrada' });
  },

  // GET /api/auth/children — returns family children for admin UI selectors
  async listChildren(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await User.findAll({
        where: { familyId: req.user!.familyId, role: 'child', isActive: true },
        include: [{ model: ChildProfile, as: 'childProfile' }],
      });
      res.json(
        users.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: (u as any).childProfile?.displayName ?? u.username,
        }))
      );
    } catch (err) {
      next(err);
    }
  },
};
