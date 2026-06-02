'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // New unified transaction type: positive=reward, negative=penalty
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_transactions_type" ADD VALUE IF NOT EXISTS 'DirectRecord';`
    );

    // Mark templates that are presets for the direct-records form
    await queryInterface.addColumn('task_templates', 'is_record_preset', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('task_templates', 'is_record_preset');
    // DirectRecord enum value cannot be removed without recreating the type
  },
};
