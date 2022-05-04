
'use strict';

const
  expect = require('chai').expect,
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  check_elements_func = require('../../lib/check_elements'),
  config = require('../../lib/config'),
  user_info_func = require('../../lib/user_info'),
  application_host = config.get_application_host(),
  schedule_form_id = '#company_schedule_form',
  userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year');

/*
 *  Scenario 1:
 *    * Register new company
 *    * Go to company details page update scedule to be non-default
 *    * Ensure that company details page shows updated schedule
 *    * Go to Calendar page and make sure that it reflects new scedule
 *    * Go to Team view page and make sure it reflects new schedule
 *
 * */

describe("Changing default company wide schedule", function () {

  this.timeout(config.get_execution_timeout());

  var page;

  it("Register new company", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
    });
  });

  it("Open company details page", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  });

  it('Ensure company has default schedule', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: schedule_form_id + ' input[name="monday"]',
        tick: true,
        value: 'on',
      }, {
        selector: schedule_form_id + ' input[name="tuesday"]',
        tick: true,
        value: 'on',
      }, {
        selector: schedule_form_id + ' input[name="wednesday"]',
        tick: true,
        value: 'on',
      }, {
        selector: schedule_form_id + ' input[name="thursday"]',
        tick: true,
        value: 'on',
      }, {
        selector: schedule_form_id + ' input[name="friday"]',
        tick: true,
        value: 'on',
      }, {
        selector: schedule_form_id + ' input[name="saturday"]',
        tick: true,
        value: 'off',
      }, {
        selector: schedule_form_id + ' input[name="sunday"]',
        tick: true,
        value: 'off',
      }],
    })
  });

  it('Make Wednesday to be non-working day', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: schedule_form_id + ' #schedule_item_wednesday',
        tick: true,
      }],
      submit_button_selector: schedule_form_id + ' button[type="submit"]',
      message: /Schedule for company was saved/,
    })
  });

  it('And make sure that it was indeed marked so', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: schedule_form_id + ' input[name="monday"]',
        tick: true,
        value: 'on',
      }, {
        selector: schedule_form_id + ' input[name="tuesday"]',
        tick: true,
        value: 'on',
      }, {
        selector: schedule_form_id + ' input[name="wednesday"]',
        tick: true,
        value: 'off',
      }, {
        selector: schedule_form_id + ' input[name="thursday"]',
        tick: true,
        value: 'on',
      }, {
        selector: schedule_form_id + ' input[name="friday"]',
        tick: true,
        value: 'on',
      }, {
        selector: schedule_form_id + ' input[name="saturday"]',
        tick: true,
        value: 'off',
      }, {
        selector: schedule_form_id + ' input[name="sunday"]',
        tick: true,
        value: 'off',
      }],
    })
  });

  it('Open Calendar page', function () {
    return open_page_func({
      url: application_host + 'calendar/?year=2015&show_full_year=1',
      page,
    })
  });

  it('... and ensure Wednesday is marked as non-working day', function () {
    // We know that 7th of January 2015 is Wednesday
    return page.$('table.month_January td.day_7')
      .then(el => el.getProperty('className'))
      .then(p => p.jsonValue())
      .then(css =>
        expect(css).to.match(/\bweekend_cell\b/)
      )
  });

  it('... and ensure that Monday is still working day', function () {
    return page.$('table.month_January td.day_5')
      .then(el => el.getProperty('className'))
      .then(p => p.jsonValue())
      .then(css =>
        expect(css).not.to.match(/\bweekend_cell\b/)
      )
  });

  it('Open Team view page', function () {
    return open_page_func({
      url: application_host + 'calendar/teamview/?&date=2015-01',
      page,
    })
  });

  it('... and make sure Wednesday is marked as non-working day', function () {
    // We know that 7th of January 2015 is Wednesday
    return page.$('table.team-view-table td.day_7')
      .then(el => el.getProperty('className'))
      .then(p => p.jsonValue())
      .then(css =>
        expect(css).to.match(/\bweekend_cell\b/)
      )
  });

  it('... and ensure Monday is still working day', function () {
    return page.$('table.team-view-table td.day_5')
      .then(el => el.getProperty('className'))
      .then(p => p.jsonValue())
      .then(css =>
        expect(css).not.to.match(/\bweekend_cell\b/)
      )
  });

  after(function () {
    return page.close();
  });

});

/*
 *  Scenario 2:
 *    * Create a company
 *    * Book holiday that streches over the weekend
 *    * Ensure it calculates "used days" correctly
 *    * Update company to have Saturday to be working day
 *    * Ensure the "used days" for previously added leave reflects the change
 * */

describe('Leave request reflects shanges in company schedule', function () {

  this.timeout(config.get_execution_timeout());

  let page, email_A;

  it("Register new company", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
      email_A = data.email;
    });
  });

  it("Obtain information about newly added user", function () {
    return user_info_func({ page, email: email_A })
  });

  it("Ensure user starts at the very beginning of current year", function () {
    return userStartsAtTheBeginingOfYear({ page, email: email_A, year: 2015 })
  });

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  });

  it("Submit new leave requesti for 7 calendar days", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: '2015-06-15',
      }, {
        selector: 'input#to',
        value: '2015-06-21',
      }],
      message: /New leave request was added/,
    })
  });

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  });

  it('... and ensure newly created request deducts 5 days from allowance', function () {
    return page.$eval('td[data-vpp="days_used"]', e => e.innerText.trim())
      .then(days_used => expect(days_used).to.be.equal('5'))
  });

  it("Open company details page", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  });

  it('Make Saturday to be working day', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: schedule_form_id + ' #schedule_item_saturday',
        tick: true,
      }],
      submit_button_selector: schedule_form_id + ' button[type="submit"]',
      message: /Schedule for company was saved/,
    })
  });

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  });

  it('... and ensure newly created request deducts 6 days from allowance', function () {
    return page.$eval('td[data-vpp="days_used"]', e => e.innerText.trim())
      .then(days_used => expect(days_used).to.be.equal('6'))
  });

  after(function () {
    return page.close();
  });

});
