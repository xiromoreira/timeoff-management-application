
'use strict';

const
  config = require('../lib/config'),
  application_host = config.get_application_host(),
  register_new_user_func = require('../lib/register_new_user'),
  logout_user_func = require('../lib/logout_user');

/*
  At this moment there is a bug when anyone can hijack acount if primary email
  is known.

  Scenario to check:
    * create new account
    * make sure we are not login
    * try create new acount for the same email as used in first step
    * System should report that such email address could not be used
      and suggest using forget password feature.

*/

describe('Reuse email from existing acount when creating new company', function () {

  this.timeout(config.get_execution_timeout());

  var admin_email, page;

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
      admin_email = data.email;
    });
  });

  it('Logout from newly created account', function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Close the browser", function () {
    return page.close().then(() => page = undefined)
  });

  it('Try to create another account with the same email', function () {
    register_new_user_func({
      application_host,
      user_email: admin_email,
      failing_error_message: 'Failed to register user please contact customer service. Error: Email is already used',
    }).then(data => {
      return data.page.close();
    });
  });

});
