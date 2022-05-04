
'use strict'

const
  expect = require('chai').expect,
  moment = require('moment'),
  login_user_func = require('../../lib/login_with_user'),
  register_new_user_func = require('../../lib/register_new_user'),
  logout_user_func = require('../../lib/logout_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  check_booking_func = require('../../lib/check_booking_on_calendar'),
  add_new_user_func = require('../../lib/add_new_user'),
  leave_type_edit_form_id = '#leave_type_edit_form',
  config = require('../../lib/config'),
  application_host = config.get_application_host()

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Update Holiday leave type to be limited
 *    - Create new user
 *    - Login as new user
 *    - Submit leave request that exceed limit
 *    - Make sure that system rejected the request
 *    - Submit leave request that is under the limit
 *    - Make sure the system accepted the request
 *
 * */

describe('Leave type limits in actoion', function () {

  this.timeout(config.get_execution_timeout())

  var non_admin_user_email, page

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page
    })
  })

  it("Open page with leave types", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  })

  it("Check that it is possible to update Limits", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="limit_0"]',
        value: '3',
      }],
      submit_button_selector: leave_type_edit_form_id + ' button[type="submit"]',
      should_be_successful: true,
      message: /Changes to leave types were saved/,
    })
  })

  it("Create new non-admin user", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      non_admin_user_email = data.new_user_email
    })
  })

  it("Logout from admin account", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as non-admin user", function () {
    return login_user_func({
      application_host, page,
      user_email: non_admin_user_email,
    })
  })

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?year=2015&show_full_year=1',
      page,
    })
  })

  it("And make sure that it is calendar indeed", function () {
    return page.title().then(title => {
      expect(title).to.be.equal('Calendar')
    })
  })

  it("Try to request new leave that exceed the limit", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: '2015-06-15',
      }, {
        selector: 'input#to',
        value: '2015-06-18',
      }],
      message: /Adding requested .* absence would exceed maximum allowed for such type by 1/,
      multi_line_message: true,
    }))
  })

  it("Add a request that fits under the limit", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
    await submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: '2015-06-15',
      }, {
        selector: 'input#to',
        value: '2015-06-17',
      }],
      message: /New leave request was added/,
    })

    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
    return check_booking_func({
      page,
      full_days: [moment('2015-06-16'), moment('2015-06-16'), moment('2015-06-17')],
      type: 'pended',
    })
  })

  after(function () {
    return page.close()
  })

})
