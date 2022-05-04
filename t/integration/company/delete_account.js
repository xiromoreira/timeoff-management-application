
"use strict";


const
  expect = require('chai').expect,
  register_new_user_func = require('../../lib/register_new_user'),
  login_user_func = require('../../lib/login_with_user'),
  logout_user_func = require('../../lib/logout_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year');

/*
 *  Scenario to test:
 *
 *    * Create Company A
 *    * Book a leave by user from company A
 *    * Created Company B
 *    * Book a leave for admin user from company B
 *    * Login as Admin from company A and remove company's account
 *    ** Ensure user is logged out
 *    ** Ensure it is not possible to login back
 *    * Login as admin of company B
 *    ** ensure that admin still has a leave registered
 *    ** ensure that there are still records in Email audit page
 *
 * */

describe("Remove company account", function () {

  this.timeout(config.get_execution_timeout());

  let page, emailCompanyA, emailCompanyB;

  it('Create Company A', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      emailCompanyA = data.email;
      page = data.page;
    });
  });

  it("Ensure user starts at the very beginning of current year", function () {
    return userStartsAtTheBeginingOfYear({ page, email: emailCompanyA, year: 2018 })
  });

  it("Book a leave by user from company A", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
    return submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#from',
        value: '2018-06-06',
      }, {
        selector: 'input#to',
        value: '2018-06-06',
      }],
      message: /New leave request was added/,
    })
  });

  it("Close down current session", function () {
    return page.close()
  });

  it('Create Company B', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      emailCompanyB = data.email;
      page = data.page;
    });
  });

  it("Ensure user starts at the very beginning of current year", function () {
    return userStartsAtTheBeginingOfYear({ page, email: emailCompanyB, year: 2018 })
      .then(() => open_page_func({ url: application_host, page }))
  });

  it("Book a leave by user from company B", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
    return submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#from',
        value: '2018-06-07',
      }, {
        selector: 'input#to',
        value: '2018-06-07',
      }],
      message: /New leave request was added/,
    })
  });

  it("Logout from Company B", function () {
    return logout_user_func({
      application_host,
      page,
    })
  });

  it("Login as Admin from company A and remove company's account", async function () {
    let companyName;

    await login_user_func({
      application_host,
      user_email: emailCompanyA,
      page,
    })

    await open_page_func({
      url: application_host + 'settings/general/',
      page,
    })

    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('button[data-target="#remove_company_modal"]')
    ])

    await submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="confirm_name"]',
        value: "blahblahblah",
      }],
      submit_button_selector: '#remove_company_form button[type="submit"]',
      message: /Failed to remove company. Reason: Provided name confirmation does not match company one/,
    })

    // Fetch company name
    companyName = await page.$eval('#input_company_name', e => e.value)

    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('button[data-target="#remove_company_modal"]')
    ])
    await submit_form_func({
      page,
      form_params: [{
        selector: 'input[name="confirm_name"]',
        value: companyName,
      }],
      submit_button_selector: '#remove_company_form button[type="submit"]',
      message: new RegExp(`Company ${companyName} and related data were successfully removed`),
    })
  });

  it("Ensure that user is logout (by trying to poen general setting page)", async function () {
    await Promise.all([
      page.waitForNavigation(),
      open_page_func({
        url: application_host + 'settings/general/',
        page,
      })
    ])
    expect(page.url()).to.include('/login/', "URL point to Login page");
  });

  it("Ensure it is not possible to login back", function () {
    return login_user_func({
      application_host, page,
      user_email: emailCompanyA,
      should_fail: true,
    })
  });

  it("Login as admin of company B", function () {
    return login_user_func({
      application_host,
      user_email: emailCompanyB,
      page,
    })
  });

  it("Ensure that admin still has a leave registered", async function () {
    await open_page_func({
      url: application_host + 'requests/',
      page,
    })

    const els = await page.$$('table.user-requests-table td[data-tom-leave-dates="1"]')
    expect(els.length, 'Ensure two elements with leave dates were found').to.be.equal(1);

    const dates_str = await Promise.all(els.map(e =>
      e.getProperty('textContent').then(value => value.jsonValue().then(str => str.replace(/\s+/g, ' ').trim()))
    ))
    expect(dates_str.sort(), 'Ensure that date ranges values are as expected')
      .to.be.deep.equal([
        '2018-06-07 (morning) 2018-06-07'
      ]);

  });

  it("Ensure that there are still records in Email audit page", async function () {
    await open_page_func({
      url: application_host + 'audit/email/',
      page,
    })
    const els = await page.$$('tr.vpp-email-audit-entry-header')
    expect(els.length, "Ensure that we have three email records").to.be.equal(3);
  });

  after(function () {
    return page.close()
  });
});
