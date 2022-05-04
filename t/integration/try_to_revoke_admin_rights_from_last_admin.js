
'use strict';

const
  register_new_user_func = require('../lib/register_new_user'),
  open_page_func = require('../lib/open_page'),
  submit_form_func = require('../lib/submit_form'),
  check_elements_func = require('../lib/check_elements'),
  add_new_user_func = require('../lib/add_new_user'),
  config = require('../lib/config'),
  user_info_func = require('../lib/user_info'),
  application_host = config.get_application_host();

/*
 * Scenario to ensure system prevent revocking admin rights from very last admin within company.
 *
 *    * Create new account with two users, one admin, one simple employee
 *    * Open edit admin user page, untick the Admin checkbox and try to submit the form
 *    * Ensure it fails
 *    * Grant admin rights to simple employee
 *    * Remove admin ritghs from simple employee, make sure it is suceessful
 *
 * */

describe('System prevent revoking admin rights from very last admin within company', function () {

  this.timeout(config.get_execution_timeout());

  var email_admin, secondary_user, page;

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
    }).then(data => {
      secondary_user = data.new_user_email
    });
  });

  it('Open Admin user edit details page', function () {
    return user_info_func({
      page,
      email: email_admin,
    }).then(data => {
      return open_page_func({
        page,
        url: application_host + 'users/edit/' + data.user.id + '/',
      });
    })
  });

  it('Ensure that Admin tickbox is checked', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'input[name="admin"]',
        tick: true,
        value: 'on',
      }],
    })
  });

  it('Try to untick the Is Admin flag and make sure system prevent from doing it', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="admin"]',
        tick: true,
        value: 'on',
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /This is last admin within company. Cannot revoke admin rights./,
    })
  });

  it('Open detail page for second employee', function () {
    return user_info_func({
      page,
      email: secondary_user,
    }).then(data => {
      return open_page_func({
        page,
        url: application_host + 'users/edit/' + data.user.id + '/',
      });
    })
  });

  it('Ensure that Admin tickbox is not checked', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'input[name="admin"]',
        tick: true,
        value: 'off',
      }],
    })
  });

  it('Make secondary user to be admin', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="admin"]',
        tick: true,
        value: 'on',
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .* were updated/,
    })
  });

  it('Ensure that secondary user bacame admin', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'input[name="admin"]',
        tick: true,
        value: 'on',
      }],
    })
  });

  it('Revoke admin rights from secondary user', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="admin"]',
        tick: true,
        value: 'off',
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .* were updated/,
    })
  });

  after(function () {
    return page.close()
  });
});
