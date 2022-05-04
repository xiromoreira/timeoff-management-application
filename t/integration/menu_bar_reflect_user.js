
'use strict';


const
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func = require('../lib/login_with_user'),
  add_new_user_func = require('../lib/add_new_user'),
  expect = require('chai').expect,
  logout_user_func = require('../lib/logout_user'),
  config = require('../lib/config'),

  application_host = config.get_application_host();

/*
 *  Scenario to check in thus test.
 *
 *  * Create new account
 *  * Login into system
 *  * Check that all admin links are available on the menu bar
 *  * Create non admin user
 *  * Login with non-admin user
 *  * Make sure that only limited set of links are available
 *  * Admon features are not available
 *
 * */

describe('Menu bar reflect permissions of logged in user', function () {

  this.timeout(config.get_execution_timeout());

  var ordinary_user_email, page;

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
    });
  });

  it("Check that all necessary menus are shown", function () {
    return check_presence_promises({
      page,
      presence: true,
      selectors: [
        'li > a[href="/calendar/"]',
        'li > a[href="/calendar/teamview/"]',
        'li > a[href="/calendar/feeds/"]',
        'li > a[href="/users/"]',
        'li > a[href="/settings/general/"]',
        'li > a[href="/settings/departments/"]',
        'li > a[href="/requests/"]',
        'li > a[href="/logout/"]',
      ],
    });
  });

  it("Create non-admin user", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      ordinary_user_email = data.new_user_email;
    });
  });

  it("Logout from admin acount", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as ordinary user", function () {
    return login_user_func({
      application_host, page,
      user_email: ordinary_user_email,
    })
  });

  it("Check that limited links are there", function () {
    return check_presence_promises({
      page,
      presence: true,
      selectors: [
        'li > a[href="/calendar/"]',
        'li > a[href="/calendar/teamview/"]',
        'li > a[href="/calendar/feeds/"]',
        'li > a[href="/requests/"]',
        'li > a[href="/logout/"]',
      ],
    });
  });

  it("Check that admin links are not shown", function () {
    return check_presence_promises({
      page,
      presence: false,
      selectors: [
        'li > a[href="/users/"]',
        'li > a[href="/settings/general/"]',
        'li > a[href="/settings/departments/"]',
      ],
    });
  });

  after(function () {
    return page.close()
  });

});

function check_presence_promises(args) {

  var selectors = args.selectors,
    page = args.page,
    presence = args.presence || false;

  return Promise.all(selectors.map(async selector => {
    const el = await page.$(selector)
    expect(el != null).to.be.equal(presence);
  }))

};
