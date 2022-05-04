
'use strict';

const expect = require('chai').expect,
  register_new_user_func = require('../lib/register_new_user'),
  open_page_func = require('../lib/open_page'),
  submit_form_func = require('../lib/submit_form'),
  add_new_user_func = require('../lib/add_new_user'),
  config = require('../lib/config'),
  application_host = config.get_application_host();

/*
 *  Scenario to check:
 *
 *    * Register new account with email EMAIL
 *    * Add new user with new email
 *    * Edit second user and try to assign email EMAIL to it
 *    * There should be an error
 *
 * */

describe('Edit user to have duplicated email', function () {

  this.timeout(config.get_execution_timeout());

  var email_admin, page;

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
      email_admin = data.email;
    });
  });

  it("Create second user", function () {
    return add_new_user_func({
      application_host, page,
    })
  });

  it("Open 'users' page", function () {
    return open_page_func({
      url: application_host + 'users/',
      page,
    })
  });

  it("Make sure that both users are shown " +
    "and click on latest user (assuming users are sorted alphabetichally and " +
    "test user names are derived from epoch)", async function () {
      const elements = await page.$$('td.user-link-cell a')
      expect(elements.length).to.be.equal(2)
      return Promise.all([
        page.waitForNavigation(),
        elements[1].click(),
      ])
    });

  it("Try to assign to second user the same email as ADMIN has", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="email_address"]',
        value: email_admin,
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Email is already in use/,
    })
  });

  it("Update email user with unique email address", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="email_address"]',
        value: 'foobar' + email_admin,
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .* were updated/,
    })
  });

  after(function () {
    return page.close()
  });

});
