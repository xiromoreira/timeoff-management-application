
'use strict';

const
  register_new_user_func = require('../../lib/register_new_user'),
  login_user_func = require('../../lib/login_with_user'),
  add_new_user_func = require('../../lib/add_new_user'),
  logout_user_func = require('../../lib/logout_user'),
  check_teamview_func = require('../../lib/teamview_check_user'),
  config = require('../../lib/config'),
  application_host = config.get_application_host();

/*
 *  Scenario to check in thus test.
 *
 *    * Register new account for user A (admin)
 *    * Create a new user B (non admin)
 *    * Open Team view page and make sure that both users are as links to Employee details page
 *    * Login as B
 *    * Open Team view and make sure that it shows both users as plain text
 *
 * */

describe('Cross linking on Teamview page', function () {

  this.timeout(config.get_execution_timeout());

  var page, user_A, user_B;

  it('Create new company', function () {
    // Performing registration process
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
      user_A = data.email;
    });
  });

  it("Create new user B", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      user_B = data.new_user_email;
    });
  });

  it("Make sure that both users are shown on Team view page", function () {
    return check_teamview_func({
      page,
      emails: [user_A, user_B],
      is_link: true
    })
  });

  it("Logout from A account", function () {
    return logout_user_func({
      application_host,
      page,
    })
  });

  it("Login as user B", function () {
    return login_user_func({
      application_host,
      user_email: user_B,
      page,
    })
  });

  it("Make sure that only user A and B are presented", function () {
    return check_teamview_func({
      page,
      emails: [user_A, user_B],
      is_link: false
    })
  });

  after(function () {
    return page.close();
  });
});
