'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id:            { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      family_id:     { type: Sequelize.UUID, allowNull: false },
      username:      { type: Sequelize.STRING(50), allowNull: false },
      email:         { type: Sequelize.STRING, unique: true, allowNull: true },
      password_hash: { type: Sequelize.STRING, allowNull: false },
      role:          { type: Sequelize.ENUM('admin', 'child'), allowNull: false },
      is_active:     { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at:    { type: Sequelize.DATE, allowNull: false },
      updated_at:    { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('users', ['family_id', 'username'], {
      unique: true,
      name: 'users_family_id_username_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
