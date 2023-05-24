
'use strict'

const
  expect = require('chai').expect,
  moment = require('moment'),
  register_new_user_func = require('../../lib/register_new_user'),
  login_user_func = require('../../lib/login_with_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  add_new_user_func = require('../../lib/add_new_user'),
  logout_user_func = require('../../lib/logout_user'),
  check_booking_func = require('../../lib/check_booking_on_calendar'),
  check_elements_func = require('../../lib/check_elements'),
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  department_edit_form_id = '#department_edit_form'

/*
 *  Scenario to check:
 *    * Add MANAGER_A
 *    * Add MANAGER_B
 *    * Add EMPLOYEE
 *    * Make sure department has MANAGER_A as a supervisor
 *    * Login as a EMPLOYEE
 *    * Book a leave request
 *    * Login as MANAGER_A and approve leave request
 *    * Login as ADMIN and change supervisor to be MANAGER_B
 *    * Login as an EMPLOYEE and revoke leave request
 *
 *    * Login as a MANAGER_B and make sure that there is
 *      a revoke request to process
 *    * Approve revoke request and make sure that EMPLOYEE
 *    does not have leave any more
 *
 * */

describe('Revoke leave request', function () {

  this.timeout(config.get_execution_timeout())

  let email_admin,
    email_manager_a,
    email_manager_b,
    email_employee,
    page

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page
      email_admin = data.email
    })
  })

  it("Create MANAGER_A-to-be user", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      email_manager_a = data.new_user_email
    })
  })

  it("Create MANAGER_A-to-be user", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      email_manager_b = data.new_user_email
    })
  })

  it("Create EMPLOYEE-to-be user", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      email_employee = data.new_user_email
    })
  })

  it("Open department management page", function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
  })

  it('Update department to be supervised by MANAGER_A', async function () {
    await open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })

    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('a[href*="/settings/departments/edit/"]')
    ])

    await submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="name"]',
        // Just to make sure it is always first in the lists
        value: 'AAAAA',
      }, {
        selector: 'select[name="allowance"]',
        option_selector: 'option[value="15"]',
        value: '15',
      }, {
        selector: 'select[name="boss_id"]',
        option_selector: 'option:nth-child(2)',
      }],
      submit_button_selector: department_edit_form_id + ' button[type="submit"]',
      message: /Department .* was updated/,
    })
  })

  it("Logout from admin account", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as EMPLOYEE user", function () {
    return login_user_func({
      application_host, page,
      user_email: email_employee,
    })
  })

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?show_full_year=1',
      page,
    })
  })

  it("And make sure that it is calendar indeed", function () {
    return page.title().then(title =>
      expect(title).to.be.equal('Calendar')
    )
  })

  it("Request new leave", function () {
    // Tuesday next week
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
  })

  it("Check that all days are marked as pended", function () {
    const first = moment().startOf('week').add(8, 'days');
    const last = moment().startOf('week').add(9, 'days');
    return check_booking_func({
      page,
      full_days: [last],
      halfs_1st_days: [first],
      type: 'pended',
    })
  })

  it("Logout from EMPLOYEE account", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as MANAGER_A user", function () {
    return login_user_func({
      application_host, page,
      user_email: email_manager_a,
    })
  })

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it('Make sure that newly created request is waiting for approval', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'tr[vpp="pending_for__' + email_employee + '"] .btn-warning',
        value: "Reject",
      }],
    })
  })

  it("Approve newly added leave request", function () {
    return Promise.all([
      page.waitForSelector('h1'),
      page.waitForNavigation(),
      page.click(
        'tr[vpp="pending_for__' + email_employee + '"] .btn-success'
      )
    ])
  })

  it("Logout from MANAGER_A account", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as ADMIN user", function () {
    return login_user_func({
      application_host, page,
      user_email: email_admin,
    })
  })

  it("Open department management page", function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
  })

  it('Update department to be supervised by MANAGER_B', async function () {
    await open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })

    await Promise.all([
      page.waitForNavigation(),
      page.waitForSelector('h1'),
      page.click('a[href*="/settings/departments/edit/"]')
    ])

    await submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="name"]',
        // Just to make sure it is always first in the lists
        value: 'AAAAA',
      }, {
        selector: 'select[name="allowance"]',
        option_selector: 'option[value="15"]',
        value: '15',
      }, {
        selector: 'select[name="boss_id"]',
        option_selector: 'option:nth-child(3)',
      }],
      submit_button_selector: department_edit_form_id + ' button[type="submit"]',
      message: /Department .* was updated/,
    })

  })

  it("Logout from admin account", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as EMPLOYEE user", function () {
    return login_user_func({
      application_host, page,
      user_email: email_employee,
    })
  })

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it('Revoke request', function () {
    return Promise.all([
      page.waitForNavigation(),
      page.waitForSelector('h1'),
      page.click('button.revoke-btn')
    ])
  })

  it("Logout from EMPLOYEE account", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as MANAGER_B user", function () {
    return login_user_func({
      application_host, page,
      user_email: email_manager_b,
    })
  })

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it("Make sure newly revoked request is shown for approval", function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'tr[vpp="pending_for__' + email_employee + '"] .btn-warning',
        value: "Reject",
      }],
    })
  })

  it("Approve revoke request", function () {
    return Promise.all([
      page.waitForNavigation(),
      page.waitForSelector('h1'),
      page.click(
        'tr[vpp="pending_for__' + email_employee + '"] .btn-success'
      )
    ])
  })

  after(function () {
    return page.close()
  })

})
