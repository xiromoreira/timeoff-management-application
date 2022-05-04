
'use strict'

const
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
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
  userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')


/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new user
 *    - Login as new user
 *    - Submit leave request for new user
 *    - Make sure that leave request is shown as a pending one for non admin user
 *    - Login as an admin user and approve leave request
 *    - Login as non admin user and check that new request is now
 *      shown as approved
 *
 * */

describe('Basic leave request', function () {

  this.timeout(config.get_execution_timeout())

  var non_admin_user_email, new_user_email, page

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      new_user_email = data.email
      page = data.page
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
      page,
      url: application_host + 'calendar/?year=2015&show_full_year=1',
    })
  })

  it("And make sure that it is calendar indeed", function () {
    return page.title().then(title =>
      expect(title).to.be.equal('Calendar')
    )
  })

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  })

  it("Following code is to ensure that non admin user can request leave only for herself", function () {
    return page.$('select#employee').then(el =>
      expect(el).to.not.exist
    )
  })

  it("Submit new leave request", function () {
    return submit_form_func({
      page,
      // The order matters here as we need to populate dropdown prior date filds
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#from',
        value: '2015-06-15',
      }, {
        selector: 'input#to',
        value: '2015-06-16',
      }],
      message: /New leave request was added/,
    })
  })

  it("Check that all days are marked as pended", function () {
    return check_booking_func({
      page,
      full_days: [moment('2015-06-16')],
      halfs_1st_days: [moment('2015-06-15')],
      type: 'pended',
    })
  })

  it("Logout from non-admin acount", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as admin user", function () {
    return login_user_func({
      application_host, page,
      user_email: new_user_email,
    })
  })

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it("Make sure newly created request is shown for approval", function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'tr[vpp="pending_for__' + non_admin_user_email + '"] .btn-warning',
        value: "Reject",
      }],
    })
  })

  it("Approve newly added leave request", function () {
    return Promise.all([
      page.waitForSelector('h1'),
      page.waitForSelector('.modal-content'),
      page.click('tr[vpp="pending_for__' + non_admin_user_email + '"] .btn-success')
    ])
  })

  it("Logout from admin acount", function () {
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

  it("Open calendar page (in full year mode)", function () {
    return open_page_func({
      page,
      url: application_host + 'calendar/?year=2015&show_full_year=1',
    })
  })

  it("And make sure that it is calendar indeed", function () {
    return page.title().then(title =>
      expect(title).to.be.equal('Calendar')
    )
  })

  it("Check that all days are marked as pended", function () {
    return check_booking_func({
      page,
      full_days: [moment('2015-06-16')],
      halfs_1st_days: [moment('2015-06-15')],
      type: 'approved',
    })
  })

  it("Open calendar page (short version)", function () {
    return open_page_func({
      page,
      url: application_host + 'requests/',
    })
  })

  it("Make sure that requests have approver been populated", function () {
    return page.$eval('.user-requests-table td.user-request-table-approver', e => e.innerText.trim())
      .then(text => {
        expect(text).to.be.not.empty
      })
  })

  after(function () {
    return page.close()
  })

})

describe.skip("Use problematic date with non default date format", function () {

  this.timeout(config.get_execution_timeout())

  var page, email

  it("Register new company with default date to be DD/MM/YY", function () {
    return register_new_user_func({
      application_host,
      default_date_format: 'DD/MM/YY',
    }).then((data) => {
      ({ email, page } = data)
    })
  })

  it("Ensure user starts at the very beginning of current year", function () {
    return userStartsAtTheBeginingOfYear({ page, email, year: 2016 })
  })

  it("Open calendar page", function () {
    return open_page_func({
      page,
      url: application_host + 'calendar/?year=2016&show_full_year=1',
    })
  })

  it("Open Book new leave pop up", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  })

  it("Make sure it is possible to place an leave request for date that was reported to be problematic", function () {
    return submit_form_func({
      page,
      // The order matters here as we need to populate dropdown prior date fields
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#from',
        value: '24/08/16',
      }, {
        selector: 'input#to',
        value: '25/08/16',
      }],
      message: /New leave request was added/,
    })
  })

  after(function () {
    return page.close()
  })

})

describe("Book the very last day of year to be a holiday", function () {

  this.timeout(config.get_execution_timeout())

  let page, email

  it("Register new company", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      ({ page, email } = data)
    })
  })

  it("Ensure user starts at the very beginning of current year", function () {
    return userStartsAtTheBeginingOfYear({ page, email, year: 2018 })
  })

  it("Place new holiday to be the very last day of the year", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
    await submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: '2018-12-31',
      }, {
        selector: 'input#to',
        value: '2018-12-31',
      }],
      message: /New leave request was added/,
    })
  })

  it("Open calendar page and ensure that the very last day of the year is marked as pending", async function () {
    await open_page_func({
      url: application_host + 'calendar/?year=2018&show_full_year=1',
      page,
    })
    await check_booking_func({
      page,
      full_days: [moment('2018-12-31')],
      type: 'pended',
    })

  })

  after(function () {
    return page.close()
  })

})
