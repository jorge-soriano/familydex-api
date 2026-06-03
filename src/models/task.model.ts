import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { TaskType, TaskFrequency } from './taskSeries.model';

export type { TaskType, TaskFrequency };
export type TaskStatus = 'Pending' | 'InReview' | 'Approved' | 'Rejected';

interface TaskAttributes {
  id: number;
  familyId: string;
  assignedTo: number;
  seriesId: number | null;
  title: string;
  description: string | null;
  type: TaskType;
  coinsReward: number;
  xpReward: number;
  status: TaskStatus;
  rejectionReason: string | null;
  dueDate: string | null;
  isEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type TaskCreationAttributes = Optional<
  TaskAttributes,
  'id' | 'description' | 'seriesId' | 'status' | 'rejectionReason' | 'dueDate' | 'isEnabled'
>;

export class Task
  extends Model<TaskAttributes, TaskCreationAttributes>
  implements TaskAttributes
{
  declare id: number;
  declare familyId: string;
  declare assignedTo: number;
  declare seriesId: number | null;
  declare title: string;
  declare description: string | null;
  declare type: TaskType;
  declare coinsReward: number;
  declare xpReward: number;
  declare status: TaskStatus;
  declare rejectionReason: string | null;
  declare dueDate: string | null;
  declare isEnabled: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Task.init(
  {
    id:              { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    familyId:        { type: DataTypes.UUID, allowNull: false },
    assignedTo:      { type: DataTypes.INTEGER, allowNull: false },
    seriesId:        { type: DataTypes.INTEGER, allowNull: true },
    title:           { type: DataTypes.STRING(200), allowNull: false },
    description:     { type: DataTypes.TEXT, allowNull: true },
    type:            { type: DataTypes.ENUM('hogar','deberes','comportamiento','responsabilidad'), allowNull: false },
    coinsReward:     { type: DataTypes.INTEGER, defaultValue: 0 },
    xpReward:        { type: DataTypes.INTEGER, defaultValue: 0 },
    status:          { type: DataTypes.ENUM('Pending','InReview','Approved','Rejected'), defaultValue: 'Pending' },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true },
    dueDate:         { type: DataTypes.DATEONLY, allowNull: true },
    isEnabled:       { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, tableName: 'tasks', modelName: 'Task', underscored: true }
);
