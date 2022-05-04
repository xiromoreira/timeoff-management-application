
'use strict';


const
  expect = require('chai').expect,
  register_new_user_func = require('../../lib/register_new_user'),
  login_user_func = require('../../lib/login_with_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  add_new_user_func = require('../../lib/add_new_user'),
  logout_user_func = require('../../lib/logout_user'),
  config = require('../../lib/config'),
  new_department_form_id = '#add_new_department_form',
  application_host = config.get_application_host(),
  company_edit_form_id = '#company_edit_form',
  department_edit_form_id = '#department_edit_form';

/*
 *  Scenario to check in thus test.
 *
 *    * Register new account for user A (supervisor and member of Sales department)
 *    * Create a new user B in Sales department
 *    * Open Team view page and make sure that both users are shown A and B
 *    * Create new department IT
 *    * Create new user C and make sure that he is a member and supervisor of IT department.
 *    * Login as B
 *    * Open Team view and make sure that it shows only two users A and B
 *     * Login as A
 *     * Open Team view and make sure that all three users are shown as A is admin
 *     * Update IT department to be supervised by user B
 *      * Login as B
 *    * Open Team view and make sure that it shows three users A, B, and C
 *    * Login with user C
 *    * Make sure that Team view page shows only user C
 *
 *    * Login as admin user A
 *    * Update company settings to have share_all_absences be TRUE
 *    * Login with user C
 *    * Make sure that Team view page shows all users from within company
 *
 * */

// Helper function to check that provided users (email) are shown on the Team view
// page
async function check_teamview(data, emails) {

  await open_page_func({
    url: application_host + 'calendar/teamview/',
    page: data.page,
  })

  // Make sure that number of users is as expected
  const elements = await data.page.$$('tr.teamview-user-list-row > td.left-column-cell')
  expect(elements.length).to.be.equal(emails.length);

  // Make sure that users are actually those as expected
  const full_names = await Promise.all(elements.map(e => e.getProperty('innerText').then(p => p.jsonValue())))
  // The idea is to extract unique tokens from provided emails
  const tokens_from_emails = emails.map(email => email.substring(0, email.lastIndexOf("@"))).sort()
  // ... extract unique tokens from full names on the page
  const tokens_from_name = full_names.map(name => name.substring(4, name.lastIndexOf(" "))).sort()
  // ... and make sure that they are matched
  expect(tokens_from_emails).to.be.eql(tokens_from_name);

};

describe('Check basic scenario for Team view page', function () {

  this.timeout(config.get_execution_timeout());

  var page, user_A, user_B, user_C;

  it('Performing registration process', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
      user_A = data.email;
    });
  });

  it("Create new user B", function () {
    return add_new_user_func({
      application_host, page,
      // We have just one department so far
      department_index: "0",
    }).then(data => {
      user_B = data.new_user_email;
    });
  });

  it("Make sure that both users are shown on Team view page", function () {
    return check_teamview({ page: page }, [user_A, user_B])
  });

  it('Create new department: "IT"', function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
  });

  it("... open new department popup and submit form", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_department_btn')
    ])
    await submit_form_func({
      page,
      form_params: [{
        selector: new_department_form_id + ' input[name="name__new"]',
        value: 'IT',
      }, {
        selector: new_department_form_id + ' select[name="allowance__new"]',
        option_selector: 'option[value="10"]',
        value: '10',
      }],
      submit_button_selector: new_department_form_id + ' button[type="submit"]',
      message: /Changes to departments were saved/,
    })
  });

  it("Create user C", function () {
    return add_new_user_func({
      application_host, page,
      // We know that departments are ordered alphabetically, so newly
      // added "ID" is before default "Sales" one
      department_index: "0",
    }).then(data => {
      user_C = data.new_user_email;
    });
  });

  it("Make sure user C is superviser of IT department", async function () {
    await open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })

    await Promise.all([
      page.waitForNavigation(),
      page.click('a[href*="/settings/departments/edit/"]')
    ])

    await submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="boss_id"]',
        // because we have test names generated based on time, user C
        // is going to be last in a drop down
        option_selector: 'option:nth-child(3)',
      }],
      submit_button_selector: department_edit_form_id + ' button[type="submit"]',
      message: /Department .* was updated/,
    })
  });

  it("Logout from A account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user B", function () {
    return login_user_func({
      application_host, page,
      user_email: user_B,
    })
  });

  it("and make sure that only user A and B are presented", function () {
    return check_teamview({ page: page }, [user_A, user_B])
  });

  it("Logout from B account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login back as user A", function () {
    return login_user_func({
      application_host, page,
      user_email: user_A,
    })
  });

  it("and make sure that all users are shown:  A, B, and C", function () {
    return check_teamview({ page: page }, [user_A, user_B, user_C])
  });

  it("Update IT department to be supervised by user B", async function () {
    await open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })

    await Promise.all([
      page.waitForNavigation(),
      page.click('a[href*="/settings/departments/edit/"]')
    ])
    await submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="boss_id"]',
        // because we have test names generated based on time, user B
        // is going to be second one in a drop down as it was added before
        // all other ones
        option_selector: 'option:nth-child(2)',
      }],
      submit_button_selector: department_edit_form_id + ' button[type="submit"]',
      message: /Department .* was updated/,
    })
  });

  it("Logout from A account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user B", function () {
    return login_user_func({
      application_host, page,
      user_email: user_B,
    })
  });

  it("and make sure that all users are shown:  A, B, and C", function () {
    return check_teamview({ page: page }, [user_A, user_B, user_C])
  });

  it("Logout from admin account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user C", function () {
    return login_user_func({
      application_host, page,
      user_email: user_C,
    })
  });

  it("and make sure that only one user C is here", function () {
    return check_teamview({ page: page }, [user_C])
  });

  it("Logout from user C account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user A", function () {
    return login_user_func({
      application_host, page,
      user_email: user_A,
    })
  });

  it("Open page for editing company details", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  });

  it("Check that company is been updated if valid values are submitted", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: company_edit_form_id + ' input[name="share_all_absences"]',
        tick: true,
        value: 'on',
      }],
      submit_button_selector: company_edit_form_id + ' button[type="submit"]',
      message: /successfully/i,
      should_be_successful: true,
    })
  });

  it("Logout from user A account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user C", function () {
    return login_user_func({
      application_host, page,
      user_email: user_C,
    })
  });

  it("and make sure that all users are shown on Team view page", function () {
    return check_teamview({ page: page }, [user_A, user_B, user_C])
  });

  after(function () {
    return page.close();
  });
});
