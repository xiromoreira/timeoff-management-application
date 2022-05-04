
'use strict';


const
  expect = require('chai').expect,
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  add_new_user_func = require('../../lib/add_new_user'),
  new_department_form_id = '#add_new_department_form',
  config = require('../../lib/config'),

  application_host = config.get_application_host();

/*
 *  Scenario to check that filtering by department feature on users page.
 *
 *    * register new company with admin user;
 *    * create new departmen: "IT"
 *    * create new user, place it into newly created department
 *    * open "users" page and make sure there are both there
 *    * click "Sales" department link and make sure that only admin user is presented
 *    * click "IT" department and make sure only second user is visible
 *    * click "All" and make sure that both users are presented
 *
 * */

describe('Check filtering on "users" page', function () {
  var page;

  this.timeout(config.get_execution_timeout());

  it("Performing registration process", function () {
    return register_new_user_func({
      application_host,
    }).then((data) => {
      page = data.page;
    });
  });

  it('Create new department "IT": open page', function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
  });

  it("... and submit the form", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_department_btn')
    ])

    return submit_form_func({
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

  it("Create new non-admin user", function () {
    return add_new_user_func({
      application_host,
      page,
      // We know that departments are ordered alphabetically, so newly
      // added "ID" is before default "Sales" one
      department_index: "0",
    })
  });

  it("Open 'users' page", function () {
    return open_page_func({
      url: application_host + 'users/',
      page,
    })
  });

  it("Make sure that both users are shown", async function () {
    const els = await page.$$('td.user_department')
    expect(els.length).to.be.equal(2);
  });

  it("Click on IT department", function () {
    // Departments are ordered by names so we are sure that first item
    // after general link "All" is going to be "IT"
    return Promise.all([
      page.waitForSelector('h1'),
      page.click('div.all-departments a:nth-child(2)')
    ])
  });

  it("... and make sure only user from IT department is shown", async function () {
    const text = await page.$eval('td.user_department', e => e.innerText.trim())
    expect(text).to.be.equal('IT');
  });

  it('Click on "Sales"', function () {
    // Departments are ordered by names so we are sure that second item
    // after general link "All" is going to be "Sales"
    return Promise.all([
      page.waitForSelector('h1'),
      page.click('div.all-departments a:nth-child(3)')
    ])
  });

  it("... department and make sure that only one user from that department is shown", async function () {
    const elements = await page.$$('td.user_department')
    expect(elements.length).to.be.equal(1);

    const text = await elements[0].getProperty('innerText').then(v => v.jsonValue())
    expect(text).to.be.equal('Sales');
  });

  it('Click on "All" filter', function () {
    return Promise.all([
      page.waitForSelector('h1'),
      page.click('div.all-departments a:nth-child(1)')
    ])
  });

  it("... and make sure that both users are presenyed", function () {
    return page.$$('td.user_department').then(els =>
      expect(els.length).to.be.equal(2)
    )
  });

  after(function () {
    return page.close();
  });

});
