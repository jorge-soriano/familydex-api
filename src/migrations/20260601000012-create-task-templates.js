'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_templates', {
      id:          { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      family_id:   { type: Sequelize.UUID, allowNull: false },
      title:       { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      type: {
        type: Sequelize.ENUM('hogar','deberes','comportamiento','responsabilidad'),
        allowNull: false,
      },
      coins_reward: { type: Sequelize.INTEGER, defaultValue: 0 },
      xp_reward:    { type: Sequelize.INTEGER, defaultValue: 0 },
      is_active:    { type: Sequelize.BOOLEAN, defaultValue: true },
      // Nullable: reserved for future variant/grouping support without schema changes
      category:   { type: Sequelize.STRING(100), allowNull: true },
      sort_order: { type: Sequelize.INTEGER,     allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('task_templates', ['family_id', 'is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('task_templates');
  },
};
