import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ChildProfileAttributes {
  id: number;
  userId: number;
  coins: number;
  xp: number;
  displayName: string;
  avatarColor: string | null;
}

type ChildProfileCreationAttributes = Optional<
  ChildProfileAttributes,
  'id' | 'coins' | 'xp' | 'avatarColor'
>;

export class ChildProfile
  extends Model<ChildProfileAttributes, ChildProfileCreationAttributes>
  implements ChildProfileAttributes
{
  declare id: number;
  declare userId: number;
  declare coins: number;
  declare xp: number;
  declare displayName: string;
  declare avatarColor: string | null;
}

ChildProfile.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    coins: { type: DataTypes.INTEGER, defaultValue: 0 },
    xp: { type: DataTypes.INTEGER, defaultValue: 0 },
    displayName: { type: DataTypes.STRING(100), allowNull: false },
    avatarColor: { type: DataTypes.STRING(7), allowNull: true },
  },
  {
    sequelize,
    tableName: 'child_profiles',
    modelName: 'ChildProfile',
  }
);
