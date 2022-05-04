
'use strict';


/*
 *  Scenario:
 *
 *    Check that values for new columns are shown only for employess
 *    currently login user can supervise.
 *
 *    The reason for this sceanrio is because in UK for instance it is illegal to share
 *    details for employees who are not supervisers. Peers should not know how many days
 *    their coleagues were off sick for instance.
 *
 *    * create account by admin user A
 *    * add user B
 *    * add user C
 *    * ensure company has "Share absences between all employees" flag ON
 *    * make user B to be superviser of user C
 *    * login as user A and ensure team view shows deducted values for all three users
 *    * login as user B and ensure she sees deducted days only for user B (self) and user C
 *      but not for user A
 *    * login as user C and ensure she sees only values for her account
 *
 * */


const
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
  new_department_form_id = '#add_new_department_form',
  company_edit_form_id = '#company_edit_form';

describe('Check that values for new columns are shown only for employess currently login user can supervise', function () {

  this.timeout(config.get_execution_timeout());

  let page,
    email_A, user_id_A,
    email_B, user_id_B,
    email_C, user_id_C;

  it("Register new company as admin user A", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
      email_A = data.email;
    });
  });

  it("Create second user B", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      email_B = data.new_user_email;
    });
  });

  it("Create second user C", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      email_C = data.new_user_email;
    });
  });

  it("Obtain information about user A", function () {
    return user_info_func({
      page,
      email: email_A,
    }).then(data => {
      user_id_A = data.user.id;
    });
  });

  it("Obtain information about user B", function () {
    return user_info_func({
      page,
      email: email_B,
    }).then(data => {
      user_id_B = data.user.id;
    });
  });

  it("Obtain information about user C", function () {
    return user_info_func({
      page,
      email: email_C,
    }).then(data => {
      user_id_C = data.user.id;
    });
  });

  it("Open page for editing company details", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  });

  it('Ensure company has "Share absences between all employees" flag OFF', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: company_edit_form_id + ' input[name="share_all_absences"]',
        value: 'off',
        tick: true,
      }],
    })
  });

  it('... and tick that box ON', function () {
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

  it("Open department management page", function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
  });

  it("Add new department and make its approver to be user B", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_department_btn')
    ])

    return submit_form_func({
      page,
      form_params: [{
        selector: `${new_department_form_id} input[name="name__new"]`,
        // Just to make sure it is always first in the lists
        value: 'AAAAA',
      }, {
        selector: `${new_department_form_id} select[name="allowance__new"]`,
        option_selector: 'option[value="15"]',
        value: '15',
      }, {
        selector: `${new_department_form_id} select[name="boss_id__new"]`,
        option_selector: `option[value="${user_id_B}"]`,
      }],
      submit_button_selector: `${new_department_form_id} button[type="submit"]`,
      message: /Changes to departments were saved/,
    })
  });

  it("Open user editing page for user B", function () {
    return open_page_func({
      url: `${application_host}users/edit/${user_id_C}/`,
      page,
    })
  });

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
  });

  it('As user A ensure team view shows deducted values for all three users', async function () {
    await open_page_func({
      url: `${application_host}calendar/teamview/`,
      page,
    })

    let txt = await page.$eval(
      `tr[data-vpp-user-list-row="${user_id_A}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )
    expect(txt).to.be.eql('0')

    txt = await page.$eval(
      `tr[data-vpp-user-list-row="${user_id_B}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )
    expect(txt).to.be.eql('0')

    txt = await page.$eval(
      `tr[data-vpp-user-list-row="${user_id_C}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )
    expect(txt).to.be.eql('0')

  });

  it("Logout from user A (admin)", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user B", function () {
    return login_user_func({
      application_host, page,
      user_email: email_B,
    })
  });

  it('Login as user B and ensure she sees deducted days only for user B (self) and user C but not for user A', async function () {
    await open_page_func({
      url: `${application_host}calendar/teamview/`,
      page,
    })

    let txt = await page.$eval(
      `tr[data-vpp-user-list-row="${user_id_A}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )
    expect(txt).to.be.eql('')

    txt = await page.$eval(
      `tr[data-vpp-user-list-row="${user_id_B}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )
    expect(txt).to.be.eql('0')

    txt = await page.$eval(
      `tr[data-vpp-user-list-row="${user_id_C}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )
    expect(txt).to.be.eql('0')

  });

  it("Logout from user B", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user C", function () {
    return login_user_func({
      application_host, page,
      user_email: email_C,
    })
  });

  it('Login as user C and ensure she sees only values for her account', async function () {
    await open_page_func({
      url: `${application_host}calendar/teamview/`,
      page,
    })

    let txt = await page.$eval(
      `tr[data-vpp-user-list-row="${user_id_A}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )
    expect(txt).to.be.eql('')

    txt = await page.$eval(
      `tr[data-vpp-user-list-row="${user_id_B}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )
    expect(txt).to.be.eql('')

    txt = await page.$eval(
      `tr[data-vpp-user-list-row="${user_id_C}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )
    expect(txt).to.be.eql('0')

  });

  after(function () {
    return page.close()
  });
});
