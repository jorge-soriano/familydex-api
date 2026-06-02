import { sequelize } from '../config/database';
import { User } from './user.model';
import { ChildProfile } from './childProfile.model';
import { TaskSeries } from './taskSeries.model';
import { Task } from './task.model';
import { Transaction } from './transaction.model';

// ── Épica 1 ──────────────────────────────────────────────────────────────────
User.hasOne(ChildProfile, { foreignKey: 'userId', as: 'childProfile' });
ChildProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ── Épica 2 ──────────────────────────────────────────────────────────────────
User.hasMany(Task,       { foreignKey: 'assignedTo', as: 'tasks' });
Task.belongsTo(User,     { foreignKey: 'assignedTo', as: 'assignedUser' });

TaskSeries.hasMany(Task, { foreignKey: 'seriesId', as: 'instances' });
Task.belongsTo(TaskSeries, { foreignKey: 'seriesId', as: 'series' });

User.hasMany(Transaction, { foreignKey: 'childId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'childId', as: 'child' });

Task.hasMany(Transaction, { foreignKey: 'taskId', as: 'transactions' });
Transaction.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

// ── Épica 4: Pokemon, CaughtPokemon ─────────────────────────────────────────
// ── Épica 5: Reward, RewardRequest ──────────────────────────────────────────

export { sequelize, User, ChildProfile, TaskSeries, Task, Transaction };
