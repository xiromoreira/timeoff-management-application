
'use strict';

const expect = require('chai').expect
const moment = require('moment')
const register_new_user_func = require('../lib/register_new_user')
const login_user_func = require('../lib/login_with_user')
const open_page_func = require('../lib/open_page')
const submit_form_func = require('../lib/submit_form')
const add_new_user_func = require('../lib/add_new_user')
const logout_user_func = require('../lib/logout_user')
const user_info_func = require('../lib/user_info')
const config = require('../lib/config')

const application_host = config.get_application_host()

/*
 * Scenario to check:
 *  * Create EMPLOYEE
 *  * Deactivate EMPLOYEE
 *  * Logout from ADMIN
 *  * Register new account for EMPLOYEE email
 *  * Logout
 *  * Login back as ADMIN
 *  * Try to activate EMPLOYEE back
 *  * Make sure system prevent of doing this
 *
 * */

describe('Deactivate and activate user', function () {

  this.timeout(config.get_execution_timeout());

  var email_admin, email_employee, employee_id, page;

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      email_admin = data.email;
      page = data.page;
    });
  });

  it("Create EMPLOYEE", function () {
    return add_new_user_func({
      application_host,
      page,
    }).then(data => {
      email_employee = data.new_user_email;
    });
  });

  it("Obtain information about employee", function () {
    return user_info_func({
      page,
      email: email_employee,
    }).then(data => {
      employee_id = data.user.id;
    });
  });

  it('Check that the deactivated badge is not displayed', async function () {
    const els = await page.$$('badge alert-warning')
    if (els.length > 0) throw new Error('The badge was found')
  });

  it('Mark EMPLOYEE as inactive by specifying end date to be in past', async function () {
    await open_page_func({
      url: application_host + 'users/edit/' + employee_id + '/',
      page,
    })
    await submit_form_func({
      page,
      form_params: [{
        selector: 'input#end_date_inp',
        value: moment().subtract(1, 'days').format('YYYY-MM-DD'),
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .+ were updated/,
      should_be_successful: true,
    })
  });

  it('Check that the deactivated badge is displayed', async function () {
    const els = await page.$$('.badge.alert-warning')
    expect(els.length).to.be.eql(1, 'No badge visible')
    const txt = await (await els[0].getProperty('textContent')).jsonValue()
    expect(txt).to.be.eql('Deactivated', 'It is not the deactivated badge');
  });

  it("Logout from ADMIN", function () {
    return logout_user_func({
      application_host,
      page,
    })
  });

  it('Create another company for EMPLOYEE email', function () {
    return register_new_user_func({
      application_host,
      user_email: email_employee,
      page,
    })
  });

  it("Logout from new company created by EMPLOYEE", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login back as ADMIN", function () {
    return login_user_func({
      application_host, page,
      user_email: email_admin,
    })
  });

  it("Try to activate EMPLOYEE back. Open details page", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + employee_id + '/',
      page,
    })
  });

  it('... use end_date in future', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#end_date_inp',
        value: moment().add(1, 'days').format('YYYY-MM-DD'),
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /There is an active account with similar email somewhere within system/,
    })
  });

  it("... use empty end_date", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#end_date_inp',
        value: '',
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /There is an active account with similar email somewhere within system/,
    })
  });

  it('Although setting end_date to some value in past still works', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#end_date_inp',
        value: moment().subtract(3, 'days').format('YYYY-MM-DD'),
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .+ were updated/,
    })
  });


  after(function () {
    return page.close()
  });
});
