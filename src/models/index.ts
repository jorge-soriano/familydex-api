import { sequelize } from '../config/database';
import { User } from './user.model';
import { ChildProfile } from './childProfile.model';

// Épica 1
User.hasOne(ChildProfile, { foreignKey: 'userId', as: 'childProfile' });
ChildProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Épica 2: Task, TaskSeries
// Épica 3: Transaction
// Épica 4: Pokemon, CaughtPokemon
// Épica 5: Reward, RewardRequest

export { sequelize, User, ChildProfile };
