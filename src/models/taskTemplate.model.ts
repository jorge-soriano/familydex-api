import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { TaskType } from './taskSeries.model';

interface TaskTemplateAttributes {
  id: number;
  familyId: string;
  title: string;
  description: string | null;
  type: TaskType;
  coinsReward: number;
  xpReward: number;
  isActive: boolean;
  category: string | null;
  sortOrder: number | null;
  isRecordPreset: boolean;   // preset for direct-records form (not a task template)
  createdAt?: Date;
  updatedAt?: Date;
}

type TaskTemplateCreationAttributes = Optional<
  TaskTemplateAttributes,
  'id' | 'description' | 'isActive' | 'category' | 'sortOrder' | 'isRecordPreset'
>;

export class TaskTemplate
  extends Model<TaskTemplateAttributes, TaskTemplateCreationAttributes>
  implements TaskTemplateAttributes
{
  declare id: number;
  declare familyId: string;
  declare title: string;
  declare description: string | null;
  declare type: TaskType;
  declare coinsReward: number;
  declare xpReward: number;
  declare isActive: boolean;
  declare category: string | null;
  declare sortOrder: number | null;
  declare isRecordPreset: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TaskTemplate.init(
  {
    id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    familyId:    { type: DataTypes.UUID, allowNull: false },
    title:       { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    type:        { type: DataTypes.ENUM('hogar','deberes','comportamiento','responsabilidad'), allowNull: false },
    coinsReward: { type: DataTypes.INTEGER, defaultValue: 0 },
    xpReward:    { type: DataTypes.INTEGER, defaultValue: 0 },
    isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },
    category:    { type: DataTypes.STRING(100), allowNull: true },
    sortOrder:      { type: DataTypes.INTEGER, allowNull: true },
    isRecordPreset: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { sequelize, tableName: 'task_templates', modelName: 'TaskTemplate', underscored: true }
);
