// Migration script to add monthly target fields to Users and create Slabs table
// Run with: npx sequelize-cli db:migrate --env development
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add columns to Users
    await queryInterface.addColumn('users', 'monthly_target_amount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Target deal amount for the current month (₹)'
    });
    await queryInterface.addColumn('users', 'monthly_achieved_amount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Achieved amount for the current month (₹)'
    });
    await queryInterface.addColumn('users', 'target_month', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'YYYY-MM indicating which month the target applies to'
    });

    // Create Slabs table
    await queryInterface.createTable('slabs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      min_volume: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      max_volume: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      commission_percent: { type: Sequelize.DECIMAL(6, 4), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'monthly_target_amount');
    await queryInterface.removeColumn('users', 'monthly_achieved_amount');
    await queryInterface.removeColumn('users', 'target_month');
    await queryInterface.dropTable('slabs');
  }
};
