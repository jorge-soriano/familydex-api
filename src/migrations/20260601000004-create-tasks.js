'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tasks', {
      id:               { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      family_id:        { type: Sequelize.UUID, allowNull: false },
      assigned_to:      { type: Sequelize.INTEGER, allowNull: false,
                          references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      series_id:        { type: Sequelize.INTEGER, allowNull: true,
                          references: { model: 'task_series', key: 'id' }, onDelete: 'SET NULL' },
      title:            { type: Sequelize.STRING(200), allowNull: false },
      description:      { type: Sequelize.TEXT, allowNull: true },
      type:             { type: Sequelize.ENUM('hogar','deberes','comportamiento','responsabilidad'), allowNull: false },
      coins_reward:     { type: Sequelize.INTEGER, defaultValue: 0 },
      xp_reward:        { type: Sequelize.INTEGER, defaultValue: 0 },
      status:           { type: Sequelize.ENUM('Pending','InReview','Approved','Rejected'),
                          defaultValue: 'Pending' },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      due_date:         { type: Sequelize.DATEONLY, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false },
      updated_at:       { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tasks', ['family_id']);
    await queryInterface.addIndex('tasks', ['assigned_to', 'status']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tasks');
  },
};
