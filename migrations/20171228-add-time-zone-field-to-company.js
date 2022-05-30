
'use strict';

var models = require('../lib/model/db');

module.exports = {
  up: function (queryInterface) {

    return queryInterface.describeTable('Companies')
      .then(function (attributes) {

        if (attributes.hasOwnProperty('timezone')) {
          return 1;
        }

        return queryInterface.addColumn(
          'Companies',
          'timezone',
          models.Company.rawAttributes.timezone
        );
      });
  },

  down: function (queryInterface) {
    return queryInterface
      .removeColumn('Companies', 'timezone');
  }
};
