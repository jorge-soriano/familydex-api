'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_series', {
      id:           { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      family_id:    { type: Sequelize.UUID, allowNull: false },
      assigned_to:  { type: Sequelize.INTEGER, allowNull: false,
                      references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      title:        { type: Sequelize.STRING(200), allowNull: false },
      description:  { type: Sequelize.TEXT, allowNull: true },
      type:         { type: Sequelize.ENUM('hogar','deberes','comportamiento','responsabilidad'), allowNull: false },
      coins_reward: { type: Sequelize.INTEGER, defaultValue: 0 },
      xp_reward:    { type: Sequelize.INTEGER, defaultValue: 0 },
      frequency:    { type: Sequelize.ENUM('Daily','Weekly'), allowNull: false },
      days_of_week: { type: Sequelize.STRING(20), allowNull: true }, // JSON array e.g. "[1,3,5]"
      is_active:    { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at:   { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('task_series');
  },
};
