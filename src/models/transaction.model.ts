import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type TransactionType = 'TaskReward' | 'Penalty' | 'RewardRedeemed';

interface TransactionAttributes {
  id: number;
  childId: number;        // FK → users.id (child)
  taskId: number | null;
  rewardRequestId: number | null;
  type: TransactionType;
  coinsDelta: number;
  xpDelta: number;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type TransactionCreationAttributes = Optional<
  TransactionAttributes,
  'id' | 'taskId' | 'rewardRequestId'
>;

export class Transaction
  extends Model<TransactionAttributes, TransactionCreationAttributes>
  implements TransactionAttributes
{
  declare id: number;
  declare childId: number;
  declare taskId: number | null;
  declare rewardRequestId: number | null;
  declare type: TransactionType;
  declare coinsDelta: number;
  declare xpDelta: number;
  declare description: string;
  declare readonly createdAt: Date;
}

Transaction.init(
  {
    id:              { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    childId:         { type: DataTypes.INTEGER, allowNull: false },
    taskId:          { type: DataTypes.INTEGER, allowNull: true },
    rewardRequestId: { type: DataTypes.INTEGER, allowNull: true },
    type:            { type: DataTypes.ENUM('TaskReward','Penalty','RewardRedeemed'), allowNull: false },
    coinsDelta:      { type: DataTypes.INTEGER, allowNull: false },
    xpDelta:         { type: DataTypes.INTEGER, allowNull: false },
    description:     { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, tableName: 'transactions', modelName: 'Transaction', underscored: true }
);
