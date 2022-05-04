
'use strict'

const
  expect = require('chai').expect,
  add_new_user_func = require('../../lib/add_new_user'),
  config = require('../../lib/config'),
  login_user_func = require('../../lib/login_with_user'),
  logout_user_func = require('../../lib/logout_user'),
  open_page_func = require('../../lib/open_page'),
  register_new_user_func = require('../../lib/register_new_user'),
  submit_form_func = require('../../lib/submit_form'),
  user_info_func = require('../../lib/user_info'),
  application_host = config.get_application_host(),
  some_weekday_date = '2015-06-17'

/*
 *  Scenario:
 *    * Create new company with admin user A and regular employee B
 *    * Update details for user B to make all its leave requests autoapproved
 *    * Login as user B and place a leave request
 *    * Ensure that it went straight to Approved status
 *    * Login as user A and ensure there is no leave request pended
 *    * Go to email audit page and ensure that last two emails are related
 *      to auto approved leave requests
 *    * Login as user B
 *    * Revoke recently added leave
 *    * Ensure that it is gone without need to be approved, no leaves are listed
 *      for user B
 *    * Login back as user A and ensure that user B does not have any leaves
 *    * There is no leave request to be processed
 *    * Go to email audit page and ensure that the last two emails are about
 *      auto approving of leave revoke
 *
 * */

describe('Auto approvals', function () {

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

  it("Open details page for user B", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + user_id_B + '/',
      page,
    })
  })

  it('Update settings to make all its leave requests auto approved', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="auto_approve"]',
        tick: true,
        value: 'on',
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .+ were updated/,
    })
  })

  it("Logout from admin user", function () {
    return logout_user_func({
      application_host,
      page,
    })
  })

  it("Login as regular user B", function () {
    return login_user_func({
      application_host,
      user_email: email_B,
      page,
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

  it("Ensure that new leave went straight to Approved status", async function () {
    const texts = await page.$$eval('tr.leave-request-row .leave-request-row-status', l =>
      l.map(e => e.innerText.trim())
    )
    expect(texts.length).to.be.eq(1)
    expect(texts[0]).to.be.eq('Approved')
  })

  it("Logout from user B", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as admin user A", function () {
    return login_user_func({
      application_host,
      user_email: email_A,
      page,
    })
  })

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it('Ensure that there is no pending leave requests', function () {
    return page.$$('.btn-warning').then(elements =>
      expect(elements.length).to.be.eq(0)
    )
  })

  it("Open email audit page", function () {
    return open_page_func({
      url: application_host + 'audit/email/',
      page,
    })
  })

  it('Ensure there were two emails regarding auto-approved leaves', function () {
    page.$$eval('tr.vpp-email-audit-entry-header a.collapsed', list => [
      list[0].innerText.trim(),
      list[1].innerText.trim()
    ]).then(subjects => {
      expect(subjects).to.contain('New leave was added and auto approved.')
      expect(subjects).to.contain('New leave was added')
    })
  })

  it("Logout from admin user", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as regular user B", function () {
    return login_user_func({
      application_host,
      user_email: email_B,
      page,
    })
  })

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it('Revoke request', async function () {
    await Promise.all([
      page.waitForSelector('h1'),
      page.waitForNavigation(),
      page.click('button.revoke-btn')
    ])
    const el = await page.$('.alert-success')
    expect(el).to.be.exist
  })

  it("Ensure that it is gone without need to be approved", function () {
    return page.$$('tr.leave-request-row .leave-request-row-status').then(elements =>
      expect(elements.length).to.be.eq(0)
    )
  })

  it("Logout from user B", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as admin user A", function () {
    return login_user_func({
      application_host,
      user_email: email_A,
      page,
    })
  })

  it('Open user B absences section', function () {
    return open_page_func({
      url: application_host + 'users/edit/' + user_id_B + '/absences/',
      page,
    })
  })

  it("Ensure that user B does not have any leaves", function () {
    return page.$$('tr.leave-request-row .leave-request-row-status').then(elements =>
      expect(elements.length).to.be.eq(0)
    )
  })

  it("Open requests page", function () {
    return open_page_func({
      page,
      url: application_host + 'requests/',
    })
  })

  it('Ensure that there is no pending leave requests', function () {
    return page.$$('btn-warning').then(elements =>
      expect(elements.length).to.be.eq(0)
    )
  })

  it("Open email audit page", function () {
    return open_page_func({
      page,
      url: application_host + 'audit/email/',
    })
  })

  it('Ensure there were two emails regarding auto-approved leaves', async function () {
    const elements = await page.$$('tr.vpp-email-audit-entry-header a.collapsed')
    const subjects = await Promise.all([
      elements[0].getProperty('innerText').then(p => p.jsonValue()),
      elements[1].getProperty('innerText').then(p => p.jsonValue())
    ])
    expect(subjects).to.contain('Leave was revoked and auto approved')
    expect(subjects).to.contain('Leave was revoked')
  })

  after(function () {
    return page.close()
  })

})
