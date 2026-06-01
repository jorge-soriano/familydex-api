'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('child_profiles', {
      id:           { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      coins:        { type: Sequelize.INTEGER, defaultValue: 0 },
      xp:           { type: Sequelize.INTEGER, defaultValue: 0 },
      display_name: { type: Sequelize.STRING(100), allowNull: false },
      avatar_color: { type: Sequelize.STRING(7), allowNull: true },
      created_at:   { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('child_profiles');
  },
};
