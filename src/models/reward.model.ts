import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface RewardAttributes {
  id: number;
  familyId: string;
  name: string;
  description: string | null;
  coinCost: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type RewardCreationAttributes = Optional<RewardAttributes, 'id' | 'description' | 'isActive'>;

export class Reward
  extends Model<RewardAttributes, RewardCreationAttributes>
  implements RewardAttributes
{
  declare id: number;
  declare familyId: string;
  declare name: string;
  declare description: string | null;
  declare coinCost: number;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Reward.init(
  {
    id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    familyId:    { type: DataTypes.UUID, allowNull: false },
    name:        { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    coinCost:    { type: DataTypes.INTEGER, allowNull: false },
    isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, tableName: 'rewards', modelName: 'Reward', underscored: true }
);
