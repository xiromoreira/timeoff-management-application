

'use strict'

const
  expect = require('chai').expect,
  moment = require('moment'),
  config = require('../../lib/config'),
  open_page_func = require('../../lib/open_page'),
  register_new_user_func = require('../../lib/register_new_user'),
  submit_form_func = require('../../lib/submit_form'),
  user_info_func = require('../../lib/user_info'),
  application_host = config.get_application_host(),
  userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 *  Scenario (based in bug #166):
 *
 *    * Create company
 *    * Obtain admin details and go to admin details page
 *    * Update admin's details to have start date as very beginnign of this year
 *    * Add one week length holiday and approve it
 *    * Check that allowance section of user details page shows "15 out of 20"
 *    * Go to employees list page and make sure used shows 5 and remaining 15
 *    * Initiate revoke procedure (but not finish)
 *    * Go to employees list page and make sure used shows 5 and remaining 15
 *
 * */

describe('Leave request cancelation', function () {

  this.timeout(config.get_execution_timeout())

  var page, email_A, user_id_A

  it("Register new company", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page
      email_A = data.email
    })
  })

  it("Obtain information about admin user A", function () {
    return user_info_func({
      page,
      email: email_A,
    }).then(data =>
      user_id_A = data.user.id
    )
  })

  it("Update admin details to have start date at very beginig of this year", function () {
    return userStartsAtTheBeginingOfYear({
      page,
      email: email_A,
    })
  })

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  })

  it("Submit new leave request for user A one weekday", function () {
    const currentYear = moment.utc().year()
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: `${currentYear}-05-01`,
      }, {
        selector: 'input#to',
        value: `${currentYear}-05-07`,
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

  it("Approve new leave request", function () {
    return Promise.all([
      page.waitForNavigation(),
      page.click('tr[vpp="pending_for__' + email_A + '"] .btn-success')
    ])
  })

  it('Open user A details page (abcenses section)', function () {
    return open_page_func({
      page,
      url: application_host + 'users/edit/' + user_id_A + '/absences/',
    })
  })

  it('Check that allowance section of user details page shows "15 out of 20"', function () {
    return page.$eval('#days_remaining_inp', e => e.value.trim())
      .then(text =>
        expect(text).to.be.eq('15 out of 20')
      )
  })

  it('Open employees list page', function () {
    return open_page_func({
      page,
      url: application_host + 'users',
    })
  })

  it('Ensure "remaining" 15', function () {
    return page.$eval(
      'tr[data-vpp-user-row="' + user_id_A + '"] .vpp-days-remaining',
      e => e.innerText.trim()
    ).then(text =>
      expect(text).to.be.eq('15')
    )
  })

  it('Ensure "used" shows 5', function () {
    return page.$eval(
      'tr[data-vpp-user-row="' + user_id_A + '"] .vpp-days-used',
      e => e.innerText.trim()
    ).then(text =>
      expect(text).to.be.eq('5')
    )
  })

  it("Open requests page", function () {
    return open_page_func({
      page,
      url: application_host + 'requests/',
    })
  })

  it('Initiate revoke procedure (but not finish)', function () {
    return Promise.all([
      page.waitForSelector('h1'),
      page.click('button.revoke-btn')
    ])
  })

  it('Open user A details page (abcenses section)', function () {
    return open_page_func({
      page,
      url: application_host + 'users/edit/' + user_id_A + '/absences/',
    })
  })

  it('Check that allowance section of user details page shows "15 out of 20"', async function () {
    const text = await page.$('#days_remaining_inp')
      .then(inp => inp.getProperty('value').then(v => v.jsonValue()))
    expect(text).to.be.eq('15 out of 20')
  })

  it('Open employees list page', function () {
    return open_page_func({
      page,
      url: application_host + 'users',
    })
  })

  it('Ensure "remaining" 15', async function () {
    const text = await page.$eval(
      'tr[data-vpp-user-row="' + user_id_A + '"] .vpp-days-remaining',
      e => e.innerText.trim())
    expect(text).to.be.eq('15')
  })

  it('Ensure "used" shows 5', async function () {
    const text = await page.$eval(
      'tr[data-vpp-user-row="' + user_id_A + '"] .vpp-days-used',
      e => e.innerText.trim())
    expect(text).to.be.eq('5')
  })

  after(function () {
    return page.close()
  })

})
