
'use strict';

// TODO: after deletion, check that actual user deleted match expected

const expect = require('chai').expect
const register_new_user_func = require('../lib/register_new_user')
const open_page_func = require('../lib/open_page')
const submit_form_func = require('../lib/submit_form')
const add_new_user_func = require('../lib/add_new_user')
const config = require('../lib/config')

const application_host = config.get_application_host()
const department_edit_form_id = '#department_edit_form'

/*
 *  Scenario to check:
 *
 *    * Register new account
 *    * Create user ADMIN that is super admin
 *    * Create user MANAGER that is a supervisor of department
 *    * Create user EMPLOYEE
 *    * Go to EMPLOYEE user detail page and remove user,
 *      should be successful
 *    * Go to MANAGER user detail page and try to delete it,
 *      should be error that user is an supervisor and cannot be
 *      removed
 *    * Update corresponding department to have new supervisor
 *    * Go to MANAGER details page again and remove it,
 *      should be successful
 *    * Go to ADMIN user page and try to remove it,
 *      should get an error that such user is an admin
 *    * Remove admin privileges from ADMIN user and try
 *      to remove it again, should be successful
 *
 * */


describe('CRUD for users', function () {

  this.timeout(config.get_execution_timeout());

  var email_admin, admin_user_id,
    email_manager, manager_user_id,
    email_employee, employee_user_id
  let page;

  it('Create new company', function () {
    return register_new_user_func({
      application_host
    })
      .then((data) => {
        page = data.page;
      });
  });


  it("Create ADMIN-to-be user", function () {
    return add_new_user_func({
      application_host, page,
    })
      .then(data => {
        email_admin = data.new_user_email;
      });
  });

  it("Create MANAGER-to-be user", function () {
    return add_new_user_func({
      application_host, page,
    })
      .then(data => {
        email_manager = data.new_user_email;
      });
  });

  it("Create EMPLOYEE-to-be user", function () {
    return add_new_user_func({
      application_host, page,
    })
      .then(data => {
        email_employee = data.new_user_email;
      })
  });

  it("Get the Admin, Manager and Employee IDs", async function () {
    await open_page_func({
      url: application_host + 'settings/departments/',
      page,
    });
    admin_user_id = await page.$eval(
      'select[name="boss_id__new"] option:nth-child(2)',
      e => e.value)
    manager_user_id = await page.$eval(
      'select[name="boss_id__new"] option:nth-child(3)',
      e => e.value)
    employee_user_id = await page.$eval(
      'select[name="boss_id__new"] option:nth-child(4)',
      e => e.value)
    for (const id of [manager_user_id, admin_user_id, employee_user_id]) {
      expect(id).to.match(/^\d+$/)
    }
  });

  it("And update its boss to be MANAGER", async function () {
    await open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
    await page.click('a[href*="/settings/departments/edit/"]')
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
        option_selector: 'option:nth-child(3)',
      }],
      submit_button_selector: department_edit_form_id + ' button[type="submit"]',
      message: /Department .* was updated/,
    })
  });

  it('Check that system has 4 users (one currently logged in and 3 added)', async function () {
    await open_page_func({
      url: application_host + 'users/',
      page,
    })
    const elements = await page.$$('td.user_department')
    expect(elements.length).to.be.equal(4)
  });

  it("Open EMPLOYEE user details page", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + employee_user_id + '/',
      page,
    });
  });

  it("And remove account (employee)", function () {
    return submit_form_func({
      submit_button_selector: 'button#remove_btn',
      page,
      message: /Employee records were removed from the system/,
      confirm_dialog: true,
    });
  });

  it("Check that system has 3 users (one currently logged in and 2 added)", async function () {
    const elements = await page.$$('td.user_department')
    expect(elements.length).to.be.equal(3)
  });

  it("Open MANAGER user details page", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + manager_user_id + '/',
      page,
    });
  });

  it("Try to remove account (manager)", function () {
    return submit_form_func({
      submit_button_selector: 'button#remove_btn',
      page,
      message: /Cannot remove supervisor/,
      confirm_dialog: true,
    });
  });

  it("Open 'users' page", function () {
    return open_page_func({
      url: application_host + 'users/',
      page,
    });
  });

  it('Check that system still has 3 users (one currently logged in and 2 added)', async function () {
    const elements = await page.$$('td.user_department')
    expect(elements.length).to.be.equal(3)
  });

  it('Open departments', function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    });
  });

  it('... and update the very first user is an supervisor', async function () {
    await open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
    await page.click('a[href*="/settings/departments/edit/"]')
    await submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="name"]',
        // just to make sure it is always first in the lists
        value: 'aaaaa',
      }, {
        selector: 'select[name="allowance"]',
        option_selector: 'option[value="15"]',
        value: '15',
      }, {
        selector: 'select[name="boss_id"]',
        option_selector: 'option:nth-child(1)',
      }],
      submit_button_selector: department_edit_form_id + ' button[type="submit"]',
      message: /Department .* was updated/,
    })
  });

  it("Open ex-MANAGER user details page", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + manager_user_id + '/',
      page,
    })
  });

  it("Remove account (ex-manager)", function () {
    return submit_form_func({
      submit_button_selector: 'button#remove_btn',
      page,
      message: /Employee records were removed from the system/,
      confirm_dialog: true,
    })
  });

  it('Check that system does not have ex-MANAGER', async function () {
    const elements = await page.$$('td.user_department')
    expect(elements.length).to.be.equal(2)
  });

  it("Open ADMIN user details page", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + admin_user_id + '/',
      page,
    })
  });

  it('Make sure that ADMIN has admin privilegues', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="admin"]',
        tick: true,
        value: 'on',
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .+ were updated/,
    })
  });

  it('... and try to remove account', function () {
    return submit_form_func({
      submit_button_selector: 'button#remove_btn',
      page,
      message: /Cannot remove administrator user/,
      confirm_dialog: true,
    })
  });

  it("Open 'users' page", function () {
    return open_page_func({
      url: application_host + 'users/',
      page,
    })
  });

  it('Check that system still has 2 users (one currently logged in and ADMIN)', async function () {
    const elements = await page.$$('td.user_department')
    expect(elements.length).to.be.equal(2)
  });

  it("Open ADMIN user details page (absences)", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + admin_user_id + '/absences/',
      page,
    })
  });

  it('Ensure Adjustment works: check that system prevents from using non-halfs for adjustments', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="adjustment"]',
        value: '1.2',
        change_step: true,
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /New allowance adjustment of user should be either whole integer number or with half/,
    })
  });

  it('If the adjustment is with half, it is OK', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="adjustment"]',
        value: '1.5',
      }],
      submit_button_selector: 'button#save_changes_btn',
      should_be_successful: true,
      message: /Details for .+ were updated/,
    })
  });

  it('If the adjustment is with half and is negative, it is OK', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="adjustment"]',
        value: '-1.5',
      }],
      submit_button_selector: 'button#save_changes_btn',
      should_be_successful: true,
      message: /Details for .+ were updated/,
    })
  });

  it("Open ADMIN user details page (general)", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + admin_user_id + '/',
      page,
    })
  });

  it('Revoke admin rights', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="admin"]',
        tick: true,
        value: 'off',
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .+ were updated/,
    })
  });

  it("Remove account (ex-admin)", function () {
    return submit_form_func({
      submit_button_selector: 'button#remove_btn',
      page,
      message: /Employee records were removed from the system/,
      confirm_dialog: true,
    })
  });

  it('Check that system has only one - currently logged in user', async function () {
    const elements = await page.$$('td.user_department')
    expect(elements.length).to.be.equal(1)
  });

  after(function () {
    return page.close();
  });
});
