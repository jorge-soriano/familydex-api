'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rewards', {
      id:          { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      family_id:   { type: Sequelize.UUID, allowNull: false },
      name:        { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      coin_cost:   { type: Sequelize.INTEGER, allowNull: false },
      is_active:   { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at:  { type: Sequelize.DATE, allowNull: false },
      updated_at:  { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('rewards', ['family_id', 'is_active']);
  },
  async down(queryInterface) { await queryInterface.dropTable('rewards'); },
};
