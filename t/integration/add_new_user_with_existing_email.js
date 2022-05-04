
'use strict';

var register_new_user_func = require('../lib/register_new_user'),
  add_new_user_func = require('../lib/add_new_user'),
  config = require('../lib/config'),
  application_host = config.get_application_host();

/*
 *  Scenario to check in this test:
 *
 *  * Create an account and get a note of email
 *  * Try to add user with the same email
 *
 * */

describe('Admin tries to add user with email used for other one', function () {

  this.timeout(config.get_execution_timeout());

  var new_user_email, page;

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(function (data) {
      page = data.page;
      new_user_email = data.email;
    })
  });

  it("Create new non-admin user", function () {
    return add_new_user_func({
      application_host, page,
      email: new_user_email,
      error_message: 'Email is already in use',
    })
  });

  after(function () {
    return page.close()
  });
});
