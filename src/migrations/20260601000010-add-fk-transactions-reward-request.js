'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addConstraint('transactions', {
      fields: ['reward_request_id'],
      type: 'foreign key',
      name: 'transactions_reward_request_id_fkey',
      references: { table: 'reward_requests', field: 'id' },
      onDelete: 'SET NULL',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint('transactions', 'transactions_reward_request_id_fkey');
  },
};
