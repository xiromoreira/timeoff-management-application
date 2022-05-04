
'use strict'

const
  moment = require('moment'),
  expect = require('chai').expect,
  add_new_user_func = require('../../lib/add_new_user'),
  check_elements_func = require('../../lib/check_elements'),
  config = require('../../lib/config'),
  login_user_func = require('../../lib/login_with_user'),
  logout_user_func = require('../../lib/logout_user'),
  open_page_func = require('../../lib/open_page'),
  register_new_user_func = require('../../lib/register_new_user'),
  submit_form_func = require('../../lib/submit_form'),
  user_info_func = require('../../lib/user_info'),
  application_host = config.get_application_host(),
  some_weekday_date = moment().utc().startOf('year').add(1, 'week').startOf('isoWeek').add(2, 'day').format('YYYY-MM-DD')

/*
 *  Scenario:
 *    * Create a company with admin user A and regular employee B
 *    * Login as regular user B and place a leave request
 *    * Go to Requests page and ensure that new entry appeared in My leaves section
 *    * New entry is in Pending status and has Delete/Cancel icon
 *    * Cancel leave request
 *    * Ensure that My requests page does not contain any entries
 *    * Login as admin user A and ensure that there is no pending leave requests
 *    * Go to email audit page and ensure that there were two emails regarding cancellation
 *    * Go to user B details and ensure its details shows nothing from allowance was used
 *    * Login back as user B
 *    * Submit leave request for the same date as the first one was
 *    * Ensure it is successful and apperes as Pending
 *
 * */

describe('Leave request cancelation', function () {

  this.timeout(config.get_execution_timeout())

  var page, email_A, email_B, user_id_A, user_id_B

  it('Check precondition', function () {
    expect(moment().format('YYYY')).to.be.eq(moment(some_weekday_date).format('YYYY'))
  })

  it("Register new company", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page
      email_A = data.email
    })
  })

  it("Create second user B", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      email_B = data.new_user_email
    })
  })

  it("Obtain information about admin user A", function () {
    return user_info_func({
      page,
      email: email_A,
    }).then(data => {
      user_id_A = data.user.id
    })
  })

  it("Obtain information about user B", function () {
    return user_info_func({
      page,
      email: email_B,
    }).then(data => {
      user_id_B = data.user.id
    })
  })

  it("Logout from user A (admin)", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as user B", function () {
    return login_user_func({
      application_host, page,
      user_email: email_B,
    })
  })

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  })

  it("Submit new leave request from user B for one weekday", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: some_weekday_date,
      }, {
        selector: 'input#to',
        value: some_weekday_date,
      }],
      message: /New leave request was added/,
    })
  })

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it('Ensure newly created request is on Requests page', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'tr.leave-request-row form[action="/requests/cancel/"] button[type="submit"]',
        value: "cancel",
      }],
    })
  })

  it('Ensure that new request is single one', function () {
    return page.$$('tr.leave-request-row').then(elements =>
      expect(elements.length).to.be.eq(1)
    )
  })

  it('Ensure that new request is in Pending status', async function () {
    const status = await page.$eval('tr.leave-request-row .leave-request-row-status', e => e.innerText.trim())
    expect(status).to.be.eq('Pending')
  })

  it("Cancel leave request", function () {
    return Promise.all([
      page.waitForNavigation(),
      page.waitForSelector('h1'),
      page.click(
        'tr.leave-request-row form[action="/requests/cancel/"] button[type="submit"]'
      )
    ])
  })

  it('Ensure that My requests page does not contain any entries', function () {
    return page.$$('tr.leave-request-row').then(elements =>
      expect(elements.length).to.be.eq(0)
    )
  })

  it(" Logout from user B account", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login back as admin user A", function () {
    return login_user_func({
      application_host, page,
      user_email: email_A,
    })
  })

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it('Ensure that there is no pending leave requests', function () {
    return page.$$('.btn-warning', elements =>
      expect(elements.length).to.be.eq(0)
    )
  })

  it("Open email audit page", function () {
    return open_page_func({
      url: application_host + 'audit/email/',
      page,
    })
  })

  it('Ensure that there were two emails regarding cancelation', function () {
    return page.$$eval(
      'tr.vpp-email-audit-entry-header a.collapsed',
      list => list.map(el => el.innerText.trim())
    ).then(subjects => {
      expect(subjects).to.contain('Leave request was cancelled')
      expect(subjects).to.contain('Cancel leave request')
    })
  })

  it('Open user B absences section', function () {
    return open_page_func({
      url: application_host + 'users/edit/' + user_id_B + '/absences/',
      page,
    })
  })

  it('Ensure its details shows nothing from allowance was used', function () {
    return page.$('#days_remaining_inp')
      .then(e => e.getProperty('value'))
      .then(v => v.jsonValue())
      .then(text => {
        // It says XX out of XX, where XX are the same
        var allowances = text.match(/(\d+) out of (\d+)/).slice(1, 3)
        expect(allowances[0]).to.be.eq(allowances[1])
      })
  })

  it("Logout from user A (admin)", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as user B", function () {
    return login_user_func({
      application_host, page,
      user_email: email_B,
    })
  })

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  })

  it("Submit leave request for the same date as the first", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: some_weekday_date,
      }, {
        selector: 'input#to',
        value: some_weekday_date,
      }],
      message: /New leave request was added/,
    })
  })

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it('Ensure that new request is in Pending status', function () {
    return page.$eval(
      'tr.leave-request-row .leave-request-row-status',
      e => e.innerText.trim()
    ).then(status =>
      expect(status).to.be.eq('Pending')
    )
  })

  after(function () {
    return page.close()
  })
})

/*
 *  Scenario:
 *    * Create a company with admin user A and regular employee B
 *    * Login as employee B and submit leave request
 *    * Ensure that Cancel button is visible for user B
 *    * Login as admin user A
 *    * Go to user B details, ensure new reuest is there but no Cancel button
 * */
describe('Check only requestor can see the Cancel button', function () {

  this.timeout(config.get_execution_timeout())

  var page, email_A, email_B, user_id_A, user_id_B

  it("Register new company", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page
      email_A = data.email
    })
  })

  it("Create second user B", function () {
    return add_new_user_func({
      application_host,
      page,
    }).then(data => {
      email_B = data.new_user_email
    })
  })

  it("Obtain information about admin user A", function () {
    return user_info_func({
      page,
      email: email_A,
    }).then(data => {
      user_id_A = data.user.id
    })
  })

  it("Obtain information about user B", function () {
    return user_info_func({
      page,
      email: email_B,
    }).then(data => {
      user_id_B = data.user.id
    })
  })

  it("Logout from user A (admin)", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as user B", function () {
    return login_user_func({
      application_host, page,
      user_email: email_B,
    })
  })

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  })

  it("Submit new leave requesti from user B", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: some_weekday_date,
      }, {
        selector: 'input#to',
        value: some_weekday_date,
      }],
      message: /New leave request was added/,
    })
  })

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it("Ensure Cancel button is visible for user B", function () {
    return page.$('tr.leave-request-row form[action="/requests/cancel/"] button[type="submit"]')
      .then(e => expect(e).to.exist)
  })

  it("Logout from user A (admin)", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as admin user A", function () {
    return login_user_func({
      application_host, page,
      user_email: email_A,
    })
  })

  it('Open user B absences section', function () {
    return open_page_func({
      url: application_host + 'users/edit/' + user_id_B + '/absences/',
      page,
    })
  })

  it("Ensure new request is there but no Cancel button", function () {
    return page.$$('form[action="/requests/cancel/"]')
      .then(cancel_btns => expect(cancel_btns.length).to.be.eq(0))
  })

  after(function () {
    return page.close()
  })

})
