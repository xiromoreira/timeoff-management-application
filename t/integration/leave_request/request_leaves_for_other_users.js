
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
  add_new_user_func = require('../../lib/add_new_user'),
  new_department_form_id = '#add_new_department_form'

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create line manager user
 *    - Create new ordenry user
 *    - Create new department
 *    - New department to be managed by line manager user
 *    - Ordernary user belongs to new departmen
 *    - Login with ordenry user and ensure that she can create leave
 *      requests only for herself
 *    - Login as a line manager and make sure she can create leave
 *      requests for herself and ordanry user
 *    - Login as a admin user and make sure she can create leave
 *      request for all users
 *
 * */

describe('Request leave for outher users', function () {

  this.timeout(config.get_execution_timeout())

  var ordenary_user_email, line_manager_email, admin_email,
    ordenary_user_id, page

  it("Create new company", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page
      admin_email = data.email
    })
  })

  it("Create new line manager user", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      line_manager_email = data.new_user_email
    })
  })

  it("Create new ordanry user", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      ordenary_user_email = data.new_user_email
    })
  })

  it("Open department management page", function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
  })

  it("Save ID of ordenry user", function () {
    return page.$eval(
      'select[name="boss_id__new"] option:nth-child(3)',
      e => e.value
    ).then(value => {
      ordenary_user_id = value
      expect(ordenary_user_id).to.match(/^\d+$/)
    })
  })

  it("Add new department and make its approver to be newly added " +
    "line manager (she is second in a list as users are ordered by AZ)", function () {
      return Promise.all([
        new Promise(res => setTimeout(res, 250)),
        page.waitForSelector('.modal-content'),
        page.click('#add_new_department_btn')
      ]).then(() => submit_form_func({
        page,
        form_params: [{
          selector: new_department_form_id + ' input[name="name__new"]',
          // Just to make sure it is always first in the lists
          value: 'AAAAA',
        }, {
          selector: new_department_form_id + ' select[name="allowance__new"]',
          option_selector: 'option[value="15"]',
          value: '15',
        }, {
          selector: new_department_form_id + ' select[name="boss_id__new"]',
          option_selector: 'option:nth-child(2)',
        }],
        submit_button_selector: new_department_form_id + ' button[type="submit"]',
        message: /Changes to departments were saved/,
      }))
    })

  it("Open user editing page for ordenry user", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + ordenary_user_id + '/',
      page,
    })
  })

  it("And make sure it is part of the newly added department", function () {
    return submit_form_func({
      submit_button_selector: 'button#save_changes_btn',
      page,
      form_params: [{
        selector: 'select[name="department"]',
        // Newly added department should be first in the list as it is
        // sorted by AZ and department started with AA
        option_selector: 'option:nth-child(1)',
      }],
      message: /Details for .* were updated/,
    })
  })

  it("Logout from admin acount", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as ordenary user", function () {
    return login_user_func({
      application_host, page,
      user_email: ordenary_user_email,
    })
  })

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      page,
    })
  })

  it("And make sure that user cannot select other users when requesting new leave", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => page.$('select#employee'))
      .then(el => expect(el).to.not.exist)
  })

  it("Logout from ordenary acount", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as line manager user", function () {
    return login_user_func({
      application_host, page,
      user_email: line_manager_email,
    })
  })

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      page,
    })
  })

  it("And make sure that user can select herself and ordenary user (because she " +
    "belongs to the department managed by current line manager)", function () {
      return Promise.all([
        new Promise(res => setTimeout(res, 250)),
        page.waitForSelector('.modal-content'),
        page.click('#book_time_off_btn')
      ]).then(() => page.$('select#employee'))
        .then(el => expect(el).to.exist)
    })

  it("... make sure there are two records in it", function () {
    return page.$$('select#employee option')
      .then(elements =>
        expect(elements.length).to.be.equal(2)
      )
  })

  it("Make sure ordenary user is in that drop down list", function () {
    page.$eval(
      'select#employee option:nth-child(2)',
      e => e.innerHtml
    ).then(text => expect(text).to.match(new RegExp(
      ordenary_user_email.substring(0, ordenary_user_email.lastIndexOf('@'))
    )))
  })

  it("Logout from ordenary acount", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as admin user", function () {
    return login_user_func({
      application_host, page,
      user_email: admin_email,
    })
  })

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      page,
    })
  })

  it("And make sure that user can select all three users", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => page.$('select#employee'))
      .then(el => expect(el).to.exist)
      .then(() => page.$$('select#employee option'))
      .then(elements => expect(elements.length).to.be.equal(3))
  })

  after(function () {
    return page.close()
  })

})
