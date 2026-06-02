import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type TaskFrequency = 'Daily' | 'Weekly';
export type TaskType = 'hogar' | 'deberes' | 'comportamiento' | 'responsabilidad';

interface TaskSeriesAttributes {
  id: number;
  familyId: string;
  assignedTo: number;
  title: string;
  description: string | null;
  type: TaskType;
  coinsReward: number;
  xpReward: number;
  frequency: TaskFrequency;
  daysOfWeek: string | null; // JSON array e.g. "[1,3,5]"
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type TaskSeriesCreationAttributes = Optional<
  TaskSeriesAttributes,
  'id' | 'description' | 'daysOfWeek' | 'isActive'
>;

export class TaskSeries
  extends Model<TaskSeriesAttributes, TaskSeriesCreationAttributes>
  implements TaskSeriesAttributes
{
  declare id: number;
  declare familyId: string;
  declare assignedTo: number;
  declare title: string;
  declare description: string | null;
  declare type: TaskType;
  declare coinsReward: number;
  declare xpReward: number;
  declare frequency: TaskFrequency;
  declare daysOfWeek: string | null;
  declare isActive: boolean;
}

TaskSeries.init(
  {
    id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    familyId:    { type: DataTypes.UUID, allowNull: false },
    assignedTo:  { type: DataTypes.INTEGER, allowNull: false },
    title:       { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    type:        { type: DataTypes.ENUM('hogar','deberes','comportamiento','responsabilidad'), allowNull: false },
    coinsReward: { type: DataTypes.INTEGER, defaultValue: 0 },
    xpReward:    { type: DataTypes.INTEGER, defaultValue: 0 },
    frequency:   { type: DataTypes.ENUM('Daily','Weekly'), allowNull: false },
    daysOfWeek:  { type: DataTypes.STRING(20), allowNull: true },
    isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, tableName: 'task_series', modelName: 'TaskSeries', underscored: true }
);
