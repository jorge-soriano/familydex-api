'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transactions', {
      id:                { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      child_id:          { type: Sequelize.INTEGER, allowNull: false,
                           references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      task_id:           { type: Sequelize.INTEGER, allowNull: true,
                           references: { model: 'tasks', key: 'id' }, onDelete: 'SET NULL' },
      reward_request_id: { type: Sequelize.INTEGER, allowNull: true }, // FK added in Épica 5
      type:              { type: Sequelize.ENUM('TaskReward','Penalty','RewardRedeemed'), allowNull: false },
      coins_delta:       { type: Sequelize.INTEGER, allowNull: false },
      xp_delta:          { type: Sequelize.INTEGER, allowNull: false },
      description:       { type: Sequelize.TEXT, allowNull: false },
      created_at:        { type: Sequelize.DATE, allowNull: false },
      updated_at:        { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('transactions', ['child_id', 'created_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('transactions');
  },
};
