import { sequelize } from '../config/database';
import { User } from './user.model';
import { ChildProfile } from './childProfile.model';
import { TaskSeries } from './taskSeries.model';
import { Task } from './task.model';
import { Transaction } from './transaction.model';
import { Pokemon } from './pokemon.model';
import { CaughtPokemon } from './caughtPokemon.model';

// ── Épica 1 ───────────────────────────────────────────────────────────────────
User.hasOne(ChildProfile,  { foreignKey: 'userId',    as: 'childProfile' });
ChildProfile.belongsTo(User, { foreignKey: 'userId',  as: 'user' });

// ── Épica 2 ───────────────────────────────────────────────────────────────────
User.hasMany(Task,          { foreignKey: 'assignedTo', as: 'tasks' });
Task.belongsTo(User,        { foreignKey: 'assignedTo', as: 'assignedUser' });
TaskSeries.hasMany(Task,    { foreignKey: 'seriesId',   as: 'instances' });
Task.belongsTo(TaskSeries,  { foreignKey: 'seriesId',   as: 'series' });
User.hasMany(Transaction,   { foreignKey: 'childId',    as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'childId',    as: 'child' });
Task.hasMany(Transaction,   { foreignKey: 'taskId',     as: 'transactions' });
Transaction.belongsTo(Task, { foreignKey: 'taskId',     as: 'task' });

// ── Épica 4 ───────────────────────────────────────────────────────────────────
User.hasMany(CaughtPokemon,    { foreignKey: 'childId',   as: 'caughtPokemon' });
CaughtPokemon.belongsTo(User,  { foreignKey: 'childId',   as: 'child' });
Pokemon.hasMany(CaughtPokemon, { foreignKey: 'pokemonId', as: 'caughtInstances' });
CaughtPokemon.belongsTo(Pokemon, { foreignKey: 'pokemonId', as: 'pokemon' });

// ── Épica 5: Reward, RewardRequest ────────────────────────────────────────────

export { sequelize, User, ChildProfile, TaskSeries, Task, Transaction, Pokemon, CaughtPokemon };
