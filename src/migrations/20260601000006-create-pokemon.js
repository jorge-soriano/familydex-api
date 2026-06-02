'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pokemon', {
      id:                      { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      pokedex_number:          { type: Sequelize.INTEGER, allowNull: false, unique: true },
      name:                    { type: Sequelize.STRING(50), allowNull: false },
      type1:                   { type: Sequelize.STRING(20), allowNull: false },
      type2:                   { type: Sequelize.STRING(20), allowNull: true },
      pokedex_description:     { type: Sequelize.TEXT, allowNull: true },
      evolution_chain_id:      { type: Sequelize.INTEGER, allowNull: true },
      evolution_order:         { type: Sequelize.INTEGER, allowNull: true }, // 1=base, 2=mid, 3=final
      evolves_to_pokedex_number: { type: Sequelize.INTEGER, allowNull: true },
      evolves_at_level:        { type: Sequelize.INTEGER, allowNull: true },
      evolution_trigger:       { type: Sequelize.STRING(100), allowNull: true },
      unlock_xp:               { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at:              { type: Sequelize.DATE, allowNull: false },
      updated_at:              { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('pokemon'); },
};
