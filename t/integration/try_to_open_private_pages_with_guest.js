
'use strict';

const get_page = require('../lib/get_page');

const
  config = require('../lib/config'),
  application_host = config.get_application_host(),
  expect = require('chai').expect,
  login_user_func = require('../lib/login_with_user'),
  register_new_user_func = require('../lib/register_new_user'),
  logout_user_func = require('../lib/logout_user'),
  add_new_user_func = require('../lib/add_new_user')


describe('Try to access private pages with guest user', function () {

  this.timeout(config.get_execution_timeout());

  it('Check pages', function () {
    // Add more URLs to check into the array below
    const promises = [
      'logout/',
      'settings/general/',
      'settings/departments/'
    ].map(async url => {
      const page = await get_page({})
      await page.goto(application_host + url)
      expect(page.url()).to.be.equal(application_host + 'login/');
      await page.close();
    })

    return Promise.all(promises)
  });

  it('Check main (dashboard) page', async function () {
    const page = await get_page();

    // Open front page
    await page.goto(application_host)
    const title = await page.title()
    expect(title).to.be.equal('Time Off Management');
    await page.close();
  });

});


describe('Try to access admin pages with non-admin user', function () {

  this.timeout(config.get_execution_timeout());

  var non_admin_user_email, page;

  var check_pathes = async function (reachable) {

    let admin_pages = [
      'users/add/',
      'users/',
      'settings/general/',
      'settings/departments/'
    ];

    for (const path of admin_pages) {
      await Promise.all([
        page.waitForNavigation(),
        page.goto(application_host + path)
      ])
      const url = await page.url()
      if (reachable) {
        expect(url).to.be.equal(application_host + path);
      } else {
        expect(url).to.be.equal(application_host + 'calendar/');
      }
    }

  };

  it("Register new admin user", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
    });
  });

  it("Iterate through admin pages and make sure they are accessible", function () {
    return check_pathes(true)
  });

  it("Add new non-admin user", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      non_admin_user_email = data.new_user_email;
    });
  });

  it("Logout from admin account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("And login with newly created non-admin account", function () {
    return login_user_func({
      application_host, page,
      user_email: non_admin_user_email,
    })
  });

  it("Iterate through pathes and make sure they are not reachable", function () {
    return check_pathes(false)
  });

  after(function () {
    return page.close()
  });

});
