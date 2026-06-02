'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // PostgreSQL supports ADD VALUE IF NOT EXISTS — idempotent
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_transactions_type" ADD VALUE IF NOT EXISTS 'DirectReward';`
    );
  },

  async down() {
    // PostgreSQL doesn't support removing enum values without recreating the type.
    // Manual steps if rollback needed:
    // 1. UPDATE transactions SET type='TaskReward' WHERE type='DirectReward';
    // 2. ALTER TABLE transactions ALTER COLUMN type TYPE TEXT;
    // 3. DROP TYPE enum_transactions_type; CREATE TYPE ... (without DirectReward);
    // 4. ALTER TABLE transactions ALTER COLUMN type TYPE enum_transactions_type USING ...;
    console.warn('Enum value removal requires manual steps — see migration comments.');
  },
};
