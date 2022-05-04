
'use strict'

const
  expect = require('chai').expect,
  moment = require('moment'),
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  login_user_func = require('../../lib/login_with_user'),
  register_new_user_func = require('../../lib/register_new_user'),
  logout_user_func = require('../../lib/logout_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  check_booking_func = require('../../lib/check_booking_on_calendar'),
  add_new_user_func = require('../../lib/add_new_user')

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new user
 *    - Login as new user
 *    - Submit leave request for new user (that incudes one end to be half)
 *    - Make sure that leve request is shown as a pending one for non admin user
 *    - Submit another leave request that overlaps with previous one,
 *      make sure it failed, cover following cases:
 *      - new request overlap with half by the full end
 *      - new request overlap with full by the half end
 *      - new request overlap with half by the half end
 *
 *   - Successfully submit new request that fits with fist one by the halfs ends
 *
 * */

describe('Overlapping leaverequest (with halfs)', function () {

  this.timeout(config.get_execution_timeout())

  var non_admin_user_email, new_user_email, page

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page
      new_user_email = data.email
    })
  })

  it("Create new non-admin user", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      non_admin_user_email = data.new_user_email
    })
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

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      page,
    })
  })

  it("And make sure that it is calendar indeed", function () {
    return page.title().then(title => {
      expect(title).to.be.equal('Calendar')
    })
  })

  it("Request new leave", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#from',
        value: '2015-06-16',
      }, {
        selector: 'input#to',
        value: '2015-06-17',
      }],
      message: /New leave request was added/,
    }))
  })

  it("Check that all days are marked as pended", function () {
    return check_booking_func({
      page,
      full_days: [moment('2015-06-17')],
      halfs_1st_days: [moment('2015-06-16')],
      type: 'pended',
    })
  })

  it("Try to request overlapping leave request (new request overlaps with half by the full end)", function () {
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
        value: '2015-06-16',
      }],
      message: /Failed to create a leave request/,
    }))
  })

  it("Try to create new request that overlaps with existing one: new request's " +
    "half end colides with full part of existing one", function () {
      return Promise.all([
        new Promise(res => setTimeout(res, 250)),
        page.waitForSelector('.modal-content'),
        page.click('#book_time_off_btn')
      ]).then(() => submit_form_func({
        page,
        form_params: [{
          selector: 'select[name="from_date_part"]',
          option_selector: 'option[value="2"]',
          value: "2",
        }, {
          selector: 'input#from',
          value: '2015-06-17',
        }, {
          selector: 'input#to',
          value: '2015-06-18',
        }],
        message: /Failed to create a leave request/,
      }))
    })

  it("Try to create new leave request that colides with existing by halfs", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="to_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#from',
        value: '2015-06-15',
      }, {
        selector: 'input#to',
        value: '2015-06-16',
      }],
      message: /Failed to create a leave request/,
    }))
  })

  it("And create correct one", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="to_date_part"]',
        option_selector: 'option[value="3"]',
        value: "3",
      }, {
        selector: 'input#from',
        value: '2015-06-15',
      }, {
        selector: 'input#to',
        value: '2015-06-16',
      }],
      message: /New leave request was added/,
    }))
  })

  it("Check that all days are marked as pended", function () {
    return check_booking_func({
      page,
      full_days: [moment('2015-06-15'), moment('2015-06-16'), moment('2015-06-17')],
      type: 'pended',
    })
  })

  after(function () {
    return page.close()
  })

})
