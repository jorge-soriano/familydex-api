import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { User } from '../models/user.model';
import { ChildProfile } from '../models/childProfile.model';
import { jwtConfig } from '../config/jwt';
import { AppError } from '../middlewares/errorHandler.middleware';

const SALT_ROUNDS = 10;

export interface RegisterAdminDto {
  email: string;
  password: string;
  username: string;
}

export interface CreateChildDto {
  username: string;
  password: string;
  displayName: string;
  avatarColor?: string;
}

export interface LoginDto {
  identifier: string;
  password: string;
}

export const authService = {
  async registerAdmin(dto: RegisterAdminDto): Promise<string> {
    const existing = await User.findOne({ where: { email: dto.email } });
    if (existing) throw new AppError(409, 'El email ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const familyId = randomUUID();

    const user = await User.create({
      familyId,
      username: dto.username,
      email: dto.email,
      passwordHash,
      role: 'admin',
    });

    return signToken(user);
  },

  async createChild(
    dto: CreateChildDto,
    adminFamilyId: string
  ): Promise<object> {
    const existing = await User.findOne({
      where: { username: dto.username, familyId: adminFamilyId },
    });
    if (existing)
      throw new AppError(409, 'El nombre de usuario ya existe en esta familia');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await User.create({
      familyId: adminFamilyId,
      username: dto.username,
      email: null,
      passwordHash,
      role: 'child',
    });

    const profile = await ChildProfile.create({
      userId: user.id,
      displayName: dto.displayName,
      avatarColor: dto.avatarColor ?? null,
    });

    return {
      id: user.id,
      username: user.username,
      displayName: profile.displayName,
      avatarColor: profile.avatarColor,
      familyId: user.familyId,
    };
  },

  async login(dto: LoginDto): Promise<string> {
    // Admins log in with email, children with username
    let user = await User.findOne({ where: { email: dto.identifier } });
    if (!user) {
      user = await User.findOne({ where: { username: dto.identifier } });
    }

    if (!user || !user.isActive) {
      throw new AppError(401, 'Credenciales incorrectas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Credenciales incorrectas');

    return signToken(user);
  },
};

function signToken(user: User): string {
  return jwt.sign(
    { userId: user.id, role: user.role, familyId: user.familyId },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
}
