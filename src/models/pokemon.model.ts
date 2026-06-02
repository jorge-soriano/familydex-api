import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface PokemonAttributes {
  id: number;
  pokedexNumber: number;
  name: string;
  type1: string;
  type2: string | null;
  pokedexDescription: string | null;
  evolutionChainId: number | null;
  evolutionOrder: number | null;   // 1=base, 2=mid, 3=final
  evolvesToPokedexNumber: number | null;
  evolvesAtLevel: number | null;
  evolutionTrigger: string | null; // narrative text shown on evolution
  unlockXp: number;                // 0=starters/evolutions, >0=capturable
}

type PokemonCreationAttributes = Optional<
  PokemonAttributes,
  'id' | 'type2' | 'pokedexDescription' | 'evolutionChainId' | 'evolutionOrder' |
  'evolvesToPokedexNumber' | 'evolvesAtLevel' | 'evolutionTrigger'
>;

export class Pokemon
  extends Model<PokemonAttributes, PokemonCreationAttributes>
  implements PokemonAttributes
{
  declare id: number;
  declare pokedexNumber: number;
  declare name: string;
  declare type1: string;
  declare type2: string | null;
  declare pokedexDescription: string | null;
  declare evolutionChainId: number | null;
  declare evolutionOrder: number | null;
  declare evolvesToPokedexNumber: number | null;
  declare evolvesAtLevel: number | null;
  declare evolutionTrigger: string | null;
  declare unlockXp: number;
}

Pokemon.init(
  {
    id:                      { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    pokedexNumber:           { type: DataTypes.INTEGER, allowNull: false, unique: true },
    name:                    { type: DataTypes.STRING(50), allowNull: false },
    type1:                   { type: DataTypes.STRING(20), allowNull: false },
    type2:                   { type: DataTypes.STRING(20), allowNull: true },
    pokedexDescription:      { type: DataTypes.TEXT, allowNull: true },
    evolutionChainId:        { type: DataTypes.INTEGER, allowNull: true },
    evolutionOrder:          { type: DataTypes.INTEGER, allowNull: true },
    evolvesToPokedexNumber:  { type: DataTypes.INTEGER, allowNull: true },
    evolvesAtLevel:          { type: DataTypes.INTEGER, allowNull: true },
    evolutionTrigger:        { type: DataTypes.STRING(100), allowNull: true },
    unlockXp:                { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: 'pokemon', modelName: 'Pokemon', underscored: true }
);
