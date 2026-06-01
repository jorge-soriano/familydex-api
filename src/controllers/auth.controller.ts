import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

function validateRegister(body: Record<string, unknown>): string | null {
  const { email, password, confirmPassword, username } = body;
  if (!email || !password || !username)
    return 'Faltan campos obligatorios';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)))
    return 'Formato de email inválido';
  if (
    String(password).length < 8 ||
    !/[A-Z]/.test(String(password)) ||
    !/\d/.test(String(password))
  )
    return 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número';
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
  if (/\s/.test(String(username)))
    return 'El nombre de usuario no puede contener espacios';
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
};
