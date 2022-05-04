
'use strict'

const
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  expect = require('chai').expect,
  login_user_func = require('../../lib/login_with_user'),
  register_new_user_func = require('../../lib/register_new_user'),
  logout_user_func = require('../../lib/logout_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  add_new_user_func = require('../../lib/add_new_user')


/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new user
 *    - Login as new user
 *    - Submit leave request for new user that has more days that allowance
 *    - Make sure that system complains about lack of allowance
 *
 * */


describe('Try to book more holidays then in allowance', function () {

  this.timeout(config.get_execution_timeout())

  var non_admin_user_email, new_user_email, page

  it("Create new company", function () {
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
      url: application_host + 'calendar/?year=2015&show_full_year=1',
      page,
    })
  })

  it("And make sure that it is calendar indeed", function () {
    return page.title().then(title => {
      expect(title).to.be.equal('Calendar')
    })
  })

  it("Request new leave", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])

    // Following code is to ensure that non admin user can request leave only for
    // herself
    const el = await page.$('select#employee')
    expect(el).to.not.exist

    // Create new leave request
    await submit_form_func({
      page,
      // The order matters here as we need to populate dropdown prior date filds
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#from',
        value: '2016-06-15',
      }, {
        selector: 'input#to',
        value: '2016-07-16',
      }],
      should_be_successful: false,
      message: /Failed to create a leave request/,
    })
  })

  it("Check that correct warning messages are shown", function () {
    return page.$$eval('div.alert', l => l.map(e => e.innerText.trim()))
      .then(texts => expect(
        texts.some(text => /Requested absence is longer than remaining allowance/.test(text))
      ).to.be.equal(true))
  })

  after(function () {
    return page.close()
  })

})
