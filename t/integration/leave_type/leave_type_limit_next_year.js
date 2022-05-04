
'use strict';

const
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
  application_host = config.get_application_host();

const next_year = moment().add(1, 'y').format('YYYY');

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Update Holiday leave type to be limited to 1 day
 *    - Create new user
 *    - Login as new user
 *    - Submit 1 day of the leave type in the next year
 *    - Make sure the system accepts the request
 *    - Login back as admin and approve the request
 *
 *    - Login back as a user and send another request for of 1 day in text year for the same leave type
 *    - Make sure system rejects the request
 *
 * */

describe('Leave type limits for next year: ' + next_year, function () {

  this.timeout(config.get_execution_timeout());

  let admin_user_email, non_admin_user_email, page;

  it('Create new company', function () {
    return register_new_user_func({ application_host })
      .then(data => {
        ({ page, email: admin_user_email } = data);
      });
  });

  it("Open page with leave types", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  });

  it("Check that it is possible to update Limits", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="limit_0"]',
        value: '1',
      }],
      submit_button_selector: leave_type_edit_form_id + ' button[type="submit"]',
      should_be_successful: true,
      message: /Changes to leave types were saved/,
    })
  });

  it("Create new non-admin user", function () {
    return add_new_user_func({ application_host, page })
      .then(data => {
        non_admin_user_email = data.new_user_email;
      });
  });

  it("Logout from admin account", function () {
    return logout_user_func({ application_host, page })
  });

  it("Login as non-admin user", function () {
    return login_user_func({
      application_host,
      user_email: non_admin_user_email,
      page,
    })
  });

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?year=' + next_year + '&show_full_year=1',
      page,
    })
  });

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
        value: next_year + '-05-11',
      }, {
        selector: 'input#to',
        value: next_year + '-05-11',
      }],
      message: /New leave request was added/,
    })

    // Check that all days are marked as pended
    await check_booking_func({
      page,
      full_days: [moment(next_year + '-05-11')],
      type: 'pended',
    })
  });

  it("Logout from regular user session", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as Admin", function () {
    return login_user_func({
      application_host, page,
      user_email: admin_user_email,
    })
  })

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  });

  it("Approve newly added leave request", function () {
    return Promise.all([
      page.waitForSelector('h1'),
      page.waitForNavigation(),
      page.click('tr[vpp="pending_for__' + non_admin_user_email + '"] .btn-success')
    ])
  });

  it("Logout from admin account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as non-admin user", function () {
    return login_user_func({
      application_host, page,
      user_email: non_admin_user_email,
    })
  });

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?year=' + next_year + '&show_full_year=1',
      page,
    })
  });

  it("And try to request one more day of the type already 100% taken", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])

    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: next_year + '-05-17',
      }, {
        selector: 'input#to',
        value: next_year + '-05-17',
      }],
      message: /Failed to create a leave request/,
    })
  });

  after(function () {
    return page.close();
  });

});
