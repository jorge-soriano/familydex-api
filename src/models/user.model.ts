import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type UserRole = 'admin' | 'child';

interface UserAttributes {
  id: number;
  familyId: string;
  username: string;
  email: string | null;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'email' | 'isActive'>;

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: number;
  declare familyId: string;
  declare username: string;
  declare email: string | null;
  declare passwordHash: string;
  declare role: UserRole;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
  {
    id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    familyId:     { type: DataTypes.UUID, allowNull: false },
    username:     { type: DataTypes.STRING(50), allowNull: false },
    email:        { type: DataTypes.STRING, unique: true, allowNull: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role:         { type: DataTypes.ENUM('admin', 'child'), allowNull: false },
    isActive:     { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
    underscored: true,  // familyId → family_id, passwordHash → password_hash, etc.
  }
);
