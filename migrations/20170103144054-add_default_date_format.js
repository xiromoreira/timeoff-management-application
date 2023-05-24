'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    queryInterface.describeTable('Companies').then(function (attributes) {

      if (attributes.hasOwnProperty('date_format')) {
        return 1;
      }

      return queryInterface.addColumn(
        'Companies',
        'date_format',
        {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'YYYY-MM-DD',
        }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.removeColumn('Companies', 'date_format');
  }
};
