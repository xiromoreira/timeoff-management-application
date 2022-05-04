
'use strict';

const login_user_func = require('../lib/login_with_user')
const register_new_user_func = require('../lib/register_new_user')
const logout_user_func = require('../lib/logout_user')
const config = require('../lib/config')

const application_host = config.get_application_host()

/*
  User emails are case insensitive.

  Scenario to check:
    * create new account with email containing capital letters
    * logout
    * try to login with same email typed in lower case letters

*/

describe('Emails are case insensitive', function () {

  this.timeout(config.get_execution_timeout());

  var admin_email, page;

  it('Register an account useing upper case letters', function () {
    return register_new_user_func({
      application_host,
      user_email: (new Date()).getTime() + 'John.Smith@TEST.com',

    }).then(data => {
      admin_email = data.email;
      page = data.page;
    });
  });

  it("Logount from current session", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login with lower case email", function () {
    return login_user_func({
      application_host, page,
      user_email: admin_email.toLowerCase(),
    })
  });

  it("Logout", function () {
    return logout_user_func({
      application_host,
      page,
    })
  });

  it("Try to login with upper case email", function () {
    return login_user_func({
      application_host, page,
      user_email: admin_email.toUpperCase(),
    })
  });

  after(function () {
    return page.close()
  });
});
