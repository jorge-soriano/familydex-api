import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type RewardRequestStatus = 'Pending' | 'Approved' | 'Rejected';

interface RewardRequestAttributes {
  id: number;
  childId: number;
  rewardId: number;
  status: RewardRequestStatus;
  rejectionReason: string | null;
  coinsReserved: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type RewardRequestCreationAttributes = Optional<
  RewardRequestAttributes,
  'id' | 'status' | 'rejectionReason'
>;

export class RewardRequest
  extends Model<RewardRequestAttributes, RewardRequestCreationAttributes>
  implements RewardRequestAttributes
{
  declare id: number;
  declare childId: number;
  declare rewardId: number;
  declare status: RewardRequestStatus;
  declare rejectionReason: string | null;
  declare coinsReserved: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

RewardRequest.init(
  {
    id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    childId:          { type: DataTypes.INTEGER, allowNull: false },
    rewardId:         { type: DataTypes.INTEGER, allowNull: false },
    status:           { type: DataTypes.ENUM('Pending','Approved','Rejected'), defaultValue: 'Pending' },
    rejectionReason:  { type: DataTypes.TEXT, allowNull: true },
    coinsReserved:    { type: DataTypes.INTEGER, allowNull: false },
  },
  { sequelize, tableName: 'reward_requests', modelName: 'RewardRequest', underscored: true }
);
