
'use strict';

var
  expect = require('chai').expect,
  moment = require('moment'),
  login_user_func = require('../../lib/login_with_user'),
  register_new_user_func = require('../../lib/register_new_user'),
  logout_user_func = require('../../lib/logout_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  check_elements_func = require('../../lib/check_elements'),
  check_booking_func = require('../../lib/check_booking_on_calendar'),
  add_new_user_func = require('../../lib/add_new_user'),
  config = require('../../lib/config'),
  application_host = config.get_application_host()

/*
 *  Scenario to check:
 *    * Add EMPLOYEE
 *    * Login as a EMPLOYEE
 *    * Book a leave request
 *    * Login as MANAGER and approve leave request
 *    * Revoke recently added leave request
 *    * Approve revoke request and make sure that EMPLOYEE
 *    does not have leave any more
 *
 * */

describe('Revoke leave request by Admin', function () {

  this.timeout(config.get_execution_timeout());

  let email_admin,
    email_employee, employee_user_id,
    page;

  it("Create new company", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      email_admin = data.email;
      page = data.page;
    });
  });

  it("Create EMPLOYEE-to-be user", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      email_employee = data.new_user_email;
    });
  });

  it("Logout from admin account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as EMPLOYEE user", function () {
    return login_user_func({
      application_host, page,
      user_email: email_employee,
    })
  });

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?show_full_year=1',
      page,
    })
  });

  it("And make sure that it is calendar indeed", function () {
    return page.title().then(title =>
      expect(title).to.be.equal('Calendar')
    )
  });

  it("Create new leave request", function () {
    // Thursday next week
    const first = moment().startOf('week').add(8, 'days').format('YYYY-MM-DD');
    const last = moment().startOf('week').add(9, 'days').format('YYYY-MM-DD');
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      // The order matters here as we need to populate dropdown prior date filds
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#from',
        value: first,
      }, {
        selector: 'input#to',
        value: last,
      }],
      message: /New leave request was added/,
    }))
  });

  it("Check that all days are marked as pended", function () {
    const first = moment().startOf('week').add(8, 'days');
    const last = moment().startOf('week').add(9, 'days');
    return check_booking_func({
      page,
      full_days: [last],
      halfs_1st_days: [first],
      type: 'pended',
    })
  });

  it("Logout from EMPLOYEE account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as an ADMIN user", function () {
    return login_user_func({
      application_host, page,
      user_email: email_admin,
    })
  });

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  });

  it('Make sure that newly created request is waiting for approval', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'tr[vpp="pending_for__' + email_employee + '"] .btn-warning',
        value: "Reject",
      }],
    })
  });

  it("Approve newly added leave request", function () {
    return Promise.all([
      page.waitForSelector('h1'),
      page.waitForNavigation(),
      page.click(
        'tr[vpp="pending_for__' + email_employee + '"] .btn-success'
      )
    ])
  });

  it("Open department settings page", function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
  });

  it("Obtain employee ID from department managment page", function () {
    return page.$eval(
      'select[name="boss_id__new"] option:nth-child(2)',
      e => e.value
    ).then(value => {
      employee_user_id = value;
      expect(employee_user_id).to.match(/^\d+$/);
    })
  });

  it("Open user editing page for Employee", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + employee_user_id + '/absences/',
      page,
    })
  });

  it("... and revoke her time off", function () {
    return Promise.all([
      page.waitForNavigation(),
      page.waitForSelector('h1'),
      page.click('button.revoke-btn')
    ])
  });

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  });

  it("Make sure newly revoked request is shown for approval", function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'tr[vpp="pending_for__' + email_employee + '"] .btn-warning',
        value: "Reject",
      }],
    })
  });

  it("Approve revoke request", function () {
    return Promise.all([
      page.waitForNavigation(),
      page.waitForSelector('h1'),
      page.click('tr[vpp="pending_for__' + email_employee + '"] .btn-success')
    ])
  });

  after(function () {
    return page.close();
  });
});
