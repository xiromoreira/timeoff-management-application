
'use strict';

const expect = require('chai').expect,
  moment = require('moment'),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func = require('../lib/login_with_user'),
  open_page_func = require('../lib/open_page'),
  submit_form_func = require('../lib/submit_form'),
  add_new_user_func = require('../lib/add_new_user'),
  logout_user_func = require('../lib/logout_user'),
  teamview_check_func = require('../lib/teamview_check_user'),
  user_info_func = require('../lib/user_info'),
  config = require('../lib/config'),
  application_host = config.get_application_host(),
  department_edit_form_id = '#department_edit_form';

/*
 * Scenario to check:
 *  * Add MANGER_A
 *  * Add EMPLOYEE
 *  * Make sure department has MANAGER_A as a superviser
 *  * Make sure EMPLOYEE shows up on the Team view page
 *  * Try to add new department and make sure EMPLOYEE is among potential approvers
 *  * Logout from super admin
 *  * Make sure EMPLOYEE is able to login
 *  * Login as ADMIN
 *  * Mark EMPLOYEE to have "end date" in the past
 *  * Make sure EMPLOYEE is not on Team view page anymore
 *  * Make sure EMPLOYEE is on the Users page
 *  * Try to add new department and make sure that EMPLOYEE is not among potentual approvers
 *  * Logout from ADMIN user
 *  * Try to login as EMPLOYEE and make sure system rejects
 *
 * */

describe('Dealing with inactive users', function () {

  this.timeout(config.get_execution_timeout());

  var email_admin, email_manager, email_employee, employee_id, page;

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
      email_admin = data.email;
    });
  });

  it("Create MANAGER", function () {
    return add_new_user_func({
      application_host,
      page,
    }).then(data => {
      email_manager = data.new_user_email;
    });
  });

  it("Create EMPLOYEE", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      email_employee = data.new_user_email;
    });
  });

  it("Open department management page", function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
  });

  it('Update department to be supervised by MANAGER', async function () {
    await open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })

    const links = await page.$$('a[href*="/settings/departments/edit/"]')
    await Promise.all([
      page.waitForNavigation(),
      links[0].click(),
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
  });

  it("Make sure EMPLOYEE shows up on the Team view page", function () {
    return teamview_check_func({
      page,
      emails: [email_admin, email_manager, email_employee],
      is_link: true,
    })
  });

  it("Open departments management page", function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
  });

  it("obtain detailed info about employee (ID etc)", function () {
    return user_info_func({
      page,
      email: email_employee,
    }).then(data => {
      employee_id = data.user.id;
    });
  });

  it("See if EMPLOYEE is among possible approvers", async function () {
    const options = await page.$$('select[name="boss_id__new"] option[value="' + employee_id + '"]')
    expect(options).to.be.not.empty;
  });

  it("Logout from admin account", function () {
    return logout_user_func({
      application_host,
      page,
    })
  });

  it('Login as an EMPLOYEE to make sure it is possible', function () {
    return login_user_func({
      application_host, page,
      user_email: email_employee,
    })
  });

  it("Logout from EMPLOYEE account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it('Login back as ADMIN', function () {
    return login_user_func({
      application_host, page,
      user_email: email_admin,
    })
  });

  it('Open employee details page', function () {
    return open_page_func({
      url: application_host + 'users/edit/' + employee_id + '/',
      page,
    })
  });

  it("Mark EMPLOYEE as one inactive one by specifying end date to be in past", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#end_date_inp',
        value: moment().subtract(1, 'days').format('YYYY-MM-DD'),
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .+ were updated/,
    })
  });

  it("Make sure EMPLOYEE is not on Team view page anymore", function () {
    return teamview_check_func({
      page,
      emails: [email_admin, email_manager],
      is_link: true,
    })
  });

  it("Open users list page", function () {
    return open_page_func({
      url: application_host + 'users/',
      page,
    })
  });

  it('Make sure that EMPLOYEE still is shown on users page despite being inactive', async function () {
    const els = await page.$$('td.user_department')
    expect(els.length).to.be.equal(3)
  });

  it('Check that employee is striked in the list', async function () {
    const els = await page.$$('a[href="/users/edit/' + employee_id + '/"] s')
    expect(els.length).to.be.eql(1, 'User is not striked')
  });

  it("Open department settings page", function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
  });

  it("Try to add new department and make sure that EMPLOYEE is not among potentual approvers", async function () {
    const els = await page.$$('select[name="boss_id__new"] option[value="' + employee_id + '"]')
    expect(els).to.be.empty
  });

  it("Logout from admin account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Try to login as EMPLOYEE and make sure system rejects", function () {
    return login_user_func({
      application_host, page,
      user_email: email_employee,
      should_fail: true,
    })
  });

  after(function () {
    return page.close()
  });
});
