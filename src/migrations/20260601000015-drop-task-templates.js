'use strict';

/**
 * Drops the task_templates table — templates have been replaced
 * by history-based suggestions (approved tasks + recent transactions).
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('task_templates');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('task_templates', {
      id:             { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      family_id:      { type: Sequelize.UUID, allowNull: false },
      title:          { type: Sequelize.STRING(200), allowNull: false },
      description:    { type: Sequelize.TEXT, allowNull: true },
      type:           { type: Sequelize.ENUM('hogar','deberes','comportamiento','responsabilidad'), allowNull: false },
      coins_reward:   { type: Sequelize.INTEGER, defaultValue: 0 },
      xp_reward:      { type: Sequelize.INTEGER, defaultValue: 0 },
      is_active:      { type: Sequelize.BOOLEAN, defaultValue: true },
      category:       { type: Sequelize.STRING(100), allowNull: true },
      sort_order:     { type: Sequelize.INTEGER, allowNull: true },
      is_record_preset: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at:     { type: Sequelize.DATE, allowNull: false },
      updated_at:     { type: Sequelize.DATE, allowNull: false },
    });
  },
};
