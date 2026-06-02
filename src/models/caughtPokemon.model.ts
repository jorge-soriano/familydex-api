import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface CaughtPokemonAttributes {
  id: number;
  childId: number;   // FK → users.id
  pokemonId: number; // FK → pokemon.id
  isActive: boolean;
  pokemonXp: number;
  caughtAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

type CaughtPokemonCreationAttributes = Optional<
  CaughtPokemonAttributes,
  'id' | 'isActive' | 'pokemonXp' | 'caughtAt'
>;

export class CaughtPokemon
  extends Model<CaughtPokemonAttributes, CaughtPokemonCreationAttributes>
  implements CaughtPokemonAttributes
{
  declare id: number;
  declare childId: number;
  declare pokemonId: number;
  declare isActive: boolean;
  declare pokemonXp: number;
  declare caughtAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CaughtPokemon.init(
  {
    id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    childId:   { type: DataTypes.INTEGER, allowNull: false },
    pokemonId: { type: DataTypes.INTEGER, allowNull: false },
    isActive:  { type: DataTypes.BOOLEAN, defaultValue: false },
    pokemonXp: { type: DataTypes.INTEGER, defaultValue: 0 },
    caughtAt:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'caught_pokemon', modelName: 'CaughtPokemon', underscored: true }
);
