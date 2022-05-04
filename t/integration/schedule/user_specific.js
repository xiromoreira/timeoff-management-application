
'use strict';

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
  schedule_form_id = '#company_schedule_form',
  userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year');

/*
 * Scenario 1: Basic user specific schedule
 *
 *    * Create a company with user A as admin
 *    * Create second user B
 *    * Update user B to have Wed to be non-working day
 *    * Ensure that User B details shows new schedule
 *    * Ensure that Company wide schedule still default: Sat and Sun are non-working
 *    * Make sure that team view shows user A has Sat and Sun as non-working days
 *    * Make sure team view shows user B has Wed, Sat, Sun as non-working days
 *    * Go to calnadar page and ensure that only Sat and Sun are non-working days
 *    * Book a 7 days holiday for user A and ansure that it has 5 deducted days
 *    * Logout form user A and login as user B
 *    * Eansure its calendar page shows WED,Sat, and Sun as non-working days
 *    * Book a holiday for 7 days and make sure that 4 days deducted from allowance
 *    * Logout from user B and logn back as admin A
 *    * Go to user B schedule and revoke it to be replaced with company wide one
 *    * Go to Team view page and ensure both users A and B have only Sat and Sun as non-working
 *
 * */

describe('Basic user specific schedule', function () {

  this.timeout(config.get_execution_timeout());

  var page, email_A, email_B, user_id_A, user_id_B;

  it("Register new company", function () {
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

  it("Ensure that user A started at the begining of current year", function () {
    return userStartsAtTheBeginingOfYear({ page, email: email_A, year: 2015 })
  });

  it('Open user B schedule and ensure wording indicates company wide one is used', async function () {
    await open_page_func({
      url: application_host + 'users/edit/' + user_id_B + '/schedule/',
      page,
    })

    expect(await page.$('a[data-vpp="link-to-company-schedule"]')).to.exist

    await page.$eval('button[name="save_user_specific_schedule"]', e => e.innerText.trim())
      .then(caption => expect(caption).to.be.equal('Override company wide schedule'))
  });

  it('Ensure it has default configuration', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'input[name="monday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="tuesday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="wednesday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="thursday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="friday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="saturday"]',
        tick: true,
        value: 'off',
      }, {
        selector: 'input[name="sunday"]',
        tick: true,
        value: 'off',
      }],
    })
  });

  it('Update user B to have Wed to be non-working day', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: '#schedule_item_wednesday',
        tick: true,
      }],
      submit_button_selector: 'button[name="save_user_specific_schedule"]',
      message: /Schedule for user was saved/,
    })
  });

  it('Ensure that User B details shows new schedule', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'input[name="monday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="tuesday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="wednesday"]',
        tick: true,
        value: 'off',
      }, {
        selector: 'input[name="thursday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="friday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="saturday"]',
        tick: true,
        value: 'off',
      }, {
        selector: 'input[name="sunday"]',
        tick: true,
        value: 'off',
      }],
    })
  });

  it("Open company details page", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  });

  it('Ensure Company wide schedule is still default: Sat, Sun are non-working', function () {
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

  it('Open Team view page', function () {
    return open_page_func({
      url: application_host + 'calendar/teamview/?&date=2015-01',
      page,
    })
  });

  it('Make sure that team view shows user A has Sat and Sun as non-working days', async function () {
    // We know that 7th of January 2015 is Wednesday
    let css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_A + '"] td.day_7'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.not.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_A + '"] td.day_10'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_A + '"] td.day_11'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)

  });

  it('Make sure team view shows user B has Wed, Sat, Sun as non-working days', async function () {
    // We know that 7th of January 2015 is Wednesday
    let css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_B + '"] td.day_7'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_B + '"] td.day_10'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_B + '"] td.day_11'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)

  });

  it('Open Calendar page', function () {
    return open_page_func({
      url: application_host + 'calendar/?year=2015&show_full_year=1',
      page,
    })
  });

  it('... ensure that only Sat and Sun are non-working days', async function () {
    let css = await page.$(
      'table.month_January td.day_7'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.not.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.month_January td.day_10'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.month_January td.day_11'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)

  });

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  });

  it("Submit new leave requesti from user A for 7 calendar days", function () {
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

  it('Open Calendar page', function () {
    return open_page_func({
      url: application_host + 'calendar/?year=2015&show_full_year=1',
      page,
    })
  });

  it('... ensure its calendar page shows WED,Sat, and Sun as non-working days', async function () {
    let css = await page.$(
      'table.month_January td.day_7'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.month_January td.day_10'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.month_January td.day_11'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)
  });

  //*    * Book a holiday for 7 days and make sure that 4 days deducted from allowance
  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  });

  it("Submit new leave requesti from user A for 7 calendar days", function () {
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


  it("Logout from user B", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user A (admin)", function () {
    return login_user_func({
      application_host, page,
      user_email: email_A,
    })
  });

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  });

  it('... and ensure irequest from user B deducts 4 days from allowance', function () {
    return page.$eval(
      'tr[vpp="pending_for__' + email_B + '"] td[data-vpp="days_used"]',
      e => e.innerText.trim()
    ).then(days_used =>
      expect(days_used).to.be.equal('4')
    )
  });

  it('Open user B schedule', async function () {
    await open_page_func({
      url: application_host + 'users/edit/' + user_id_B + '/schedule/',
      page,
    })
    expect(await page.$(
      'strong[data-vpp="declare-user-specific-schedule"]'
    )).to.exist

    const caption = await page.$eval(
      'button[name="save_user_specific_schedule"]',
      e => e.innerText.trim()
    )
    expect(caption).to.be.equal('Save employee specific schedule');
  });

  it('Revoke user specific schedule and replace it with company wide one', function () {
    return submit_form_func({
      page,
      form_params: [{}],
      submit_button_selector: 'button[name="revoke_user_specific_schedule"]',
      message: /Schedule for user was saved/,
    })
  });

  it('Ensure that User B details shows new schedule', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'input[name="monday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="tuesday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="wednesday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="thursday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="friday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="saturday"]',
        tick: true,
        value: 'off',
      }, {
        selector: 'input[name="sunday"]',
        tick: true,
        value: 'off',
      }],
    })
  });

  it('Open Team view page', function () {
    return open_page_func({
      url: application_host + 'calendar/teamview/?&date=2015-01',
      page,
    })
  });

  it('Make sure that team view shows user A has Sat and Sun as non-working days', async function () {
    let css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_A + '"] td.day_7'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.not.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_A + '"] td.day_10'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_A + '"] td.day_11'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)
  });

  it('Make sure team view shows user B also has Sat, Sun as non-working days', async function () {
    let css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_B + '"] td.day_7'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.not.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_B + '"] td.day_10'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)

    css = await page.$(
      'table.team-view-table tr[data-vpp-user-list-row="' + user_id_B + '"] td.day_11'
    ).then(e => e.getProperty('className')).then(p => p.jsonValue())
    expect(css).to.match(/\bweekend_cell\b/)
  });

  after(function () {
    return page.close();
  });
});

/*
 *  Scenario 2: Populate company wide schedule before using user specific one
 *    (the main point of this test is to ensure that having explicite company schedule
 *    does not break things)
 *
 *    * Create company with User A and User B
 *    * Populate company schedule with something other than default: Thu, Fri, Sat, Sun
 *    * Go and update user B to have specific schedule: Fri, Sat, Sun
 *    * Open Teamview page and make sure users A and B have correct non-working days
 *
 * */

describe('Populate company wide schedule before using user specific one', function () {

  this.timeout(config.get_execution_timeout());

  var page, email_A, email_B, user_id_A, user_id_B;

  it("Register new company", function () {
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

  it("Open company details page", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  });

  it('Make Thu and Fri to be non-working day', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: schedule_form_id + ' #schedule_item_thursday',
        tick: true,
      }, {
        selector: schedule_form_id + ' #schedule_item_friday',
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
        value: 'on',
      }, {
        selector: schedule_form_id + ' input[name="thursday"]',
        tick: true,
        value: 'off',
      }, {
        selector: schedule_form_id + ' input[name="friday"]',
        tick: true,
        value: 'off',
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

  it('Open user B schedule', function () {
    return open_page_func({
      url: application_host + 'users/edit/' + user_id_B + '/schedule/',
      page,
    })
  });

  it('Update user B to have Fri to be non-working day (by toggling off Thu)', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: '#schedule_item_thursday',
        tick: true,
      }],
      submit_button_selector: 'button[name="save_user_specific_schedule"]',
      message: /Schedule for user was saved/,
    })
  });

  it('Ensure that User B details shows new schedule', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'input[name="monday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="tuesday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="wednesday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="thursday"]',
        tick: true,
        value: 'on',
      }, {
        selector: 'input[name="friday"]',
        tick: true,
        value: 'off',
      }, {
        selector: 'input[name="saturday"]',
        tick: true,
        value: 'off',
      }, {
        selector: 'input[name="sunday"]',
        tick: true,
        value: 'off',
      }],
    })
  });

  it('Open Team view page', function () {
    return open_page_func({
      url: application_host + 'calendar/teamview/?&date=2015-01',
      page,
    })
  });

  it('Ensure team view shows user A has Mon, Tue, Wed as working days', function () {
    return Promise.all([5, 6, 7].map(async day_number =>
      page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id_A + '"] td.day_' + day_number)
        .then(el => el.getProperty('className')).then(p => p.jsonValue())
        .then(css => expect(css).to.not.match(/\bweekend_cell\b/))
    ))
  });

  it('Ensure team view shows user A has Thu, Fri, Sat, Sun as non-working days', function () {
    return Promise.all([8, 9, 10, 11].map(async day_number =>
      page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id_A + '"] td.day_' + day_number)
        .then(el => el.getProperty('className')).then(p => p.jsonValue())
        .then(css => expect(css).to.match(/\bweekend_cell\b/))
    ))
  });

  it('Ensure team view shows user B has Mon, Tue, Wed, Thu as working days', function () {
    return Promise.all([5, 6, 7, 8].map(async day_number =>
      page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id_B + '"] td.day_' + day_number)
        .then(el => el.getProperty('className')).then(p => p.jsonValue())
        .then(css => expect(css).to.not.match(/\bweekend_cell\b/))
    ))
  });

  it('Ensure team view shows user B has Fri, Sat, Sun as non-working days', function () {
    return Promise.all([9, 10, 11].map(async day_number =>
      page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id_B + '"] td.day_' + day_number)
        .then(el => el.getProperty('className')).then(p => p.jsonValue())
        .then(css => expect(css).to.match(/\bweekend_cell\b/))
    ))
  });

  after(function () {
    return page.close();
  });
});
