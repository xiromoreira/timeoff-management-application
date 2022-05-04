
'use strict';

const
  register_new_user_func = require('../lib/register_new_user'),
  expect = require('chai').expect,
  open_page_func = require('../lib/open_page'),
  submit_form_func = require('../lib/submit_form'),
  config = require('../lib/config'),
  moment = require('moment'),

  application_host = config.get_application_host();


describe('Register new user', function () {
  var page;

  this.timeout(config.get_execution_timeout());

  it("Performing registration process", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
    });
  });

  it('Navigate to current uer details', function () {
    return open_page_func({
      url: application_host + 'users/',
      page,
    }).then(() =>
      page.click('td.user-link-cell a')
    )
  });

  it('Update start date to be mid-year', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#start_date_inp',
        value: moment.utc().year() + '-06-01',
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .* were updated/,
    })
  });

  it('Go back to Calendar page and ensure that available and total days are same and are 12', async function () {
    await open_page_func({
      url: application_host + 'calendar/',
      page,
    })
    const days = await page.$eval('[data-tom-days-available-in-allowance]', e => e.innerText)
    expect(days, 'Ensure that reported days available in allowance is correct').to.be.equal('12')

    const totalDays = await page.$eval('[data-tom-total-days-in-allowance]', e => e.innerText)
    expect(totalDays, 'Ensure that reported total days in allowance is correct').to.be.equal('12')
  });

  it('Navigate to current user details', async function () {
    await open_page_func({
      url: application_host + 'users/',
      page,
    })
    return Promise.all([
      page.waitForNavigation(),
      page.click('td.user-link-cell a')
    ])
  });

  it('Update start date to be start of the year', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#start_date_inp',
        value: moment.utc().year() + '-01-01',
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .* were updated/,
    })
  });

  it('Go back to Calendar page and ensure that available and total days are same and are 20', async function () {
    await open_page_func({
      url: application_host + 'calendar/',
      page,
    })
    let days = await page.$eval('[data-tom-days-available-in-allowance]', e => e.innerText)
    expect(days, 'Ensure that reported days available in allowance is correct').to.be.equal('20');
    days = await page.$eval('[data-tom-total-days-in-allowance]', e => e.innerText)
    expect(days, 'Ensure that reported total days in allowance is correct').to.be.equal('20');
  });

  after(function () {
    return page.close()
  });

});

