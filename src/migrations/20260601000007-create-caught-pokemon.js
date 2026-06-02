'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('caught_pokemon', {
      id:         { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      child_id:   { type: Sequelize.INTEGER, allowNull: false,
                    references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      pokemon_id: { type: Sequelize.INTEGER, allowNull: false,
                    references: { model: 'pokemon', key: 'id' } },
      is_active:  { type: Sequelize.BOOLEAN, defaultValue: false },
      pokemon_xp: { type: Sequelize.INTEGER, defaultValue: 0 },
      caught_at:  { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('caught_pokemon', ['child_id']);
    await queryInterface.addIndex('caught_pokemon', ['child_id', 'is_active']);
  },
  async down(queryInterface) { await queryInterface.dropTable('caught_pokemon'); },
};
