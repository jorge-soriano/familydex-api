'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reward_requests', {
      id:               { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      child_id:         { type: Sequelize.INTEGER, allowNull: false,
                          references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      reward_id:        { type: Sequelize.INTEGER, allowNull: false,
                          references: { model: 'rewards', key: 'id' }, onDelete: 'CASCADE' },
      status:           { type: Sequelize.ENUM('Pending','Approved','Rejected'), defaultValue: 'Pending' },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      coins_reserved:   { type: Sequelize.INTEGER, allowNull: false },
      created_at:       { type: Sequelize.DATE, allowNull: false },
      updated_at:       { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('reward_requests', ['child_id', 'status']);
  },
  async down(queryInterface) { await queryInterface.dropTable('reward_requests'); },
};
