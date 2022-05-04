
'use strict';

const
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  user_info_func = require('../../lib/user_info'),
  config = require('../../lib/config'),
  expect = require('chai').expect,
  application_host = config.get_application_host(),
  leave_type_edit_form_id = '#leave_type_edit_form',
  userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year');

/*
 *  Aim of the scenario: to ensure that half a days are highlighted correctly
 *  on calenda page.
 *
 *  In addition ensure that reports count half a days correctly.
 *
 *   * Create an account
 *   * Changes default color for Sick days to be "color 3"
 *   * Add following absences:
 *   ** 2018-02-01 (afternoon) - 2018-02-02 (morning) : Sick (1 day)
 *   ** 2018-02-02 (afternoon) - 2018-02-02 (afternnon) : Holiday (0.5 days)
 *   ** 2018-02-08 (morning)   - 2018-02-08 (morning) : Holiday (0.5 days)
 *   ** 2018-02-13 (afternoon) - 2018-02-14 (morning) : Sick (1 day)
 *   ** 2018-02-14 (afternoon) - 2018-02-15 (morning) : Holiday (1 day)
 *   * Ensure that all absences are approved
 *   * Go to callendar page and ensure that all half days cells have correct color classes
 *   * Go to Team view page and ensure that all half a day cells have correct color classes
 *   * On Team view page ensure that days deducted from allowance are stated correctly
 *   ** 2 days
 *   * Go to report page and for 2018-02 ensure that report contains correct summaries:
 *   ** Sick:  2 days
 *   ** Holiday: 2 days
 *   ** Allowance: 2 days
 *
 * */

describe('Coloring of half days', function () {

  let page, user_email, user_id,
    leave_type_holiday_id, leave_type_sick_id;

  this.timeout(config.get_execution_timeout());

  it("Performing registration process", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
      user_email = data.email;
    });
  });

  it("Obtain information user", function () {
    return user_info_func({
      page,
      email: user_email,
    }).then(data => {
      user_id = data.user.id;
    });
  });

  it("Ensure user starts at the very beginning of current year", function () {
    return userStartsAtTheBeginingOfYear({ page, email: user_email, year: 2018 })
      .then(() => open_page_func({ url: application_host, page }))
  });

  it('Changes default color for Sick days to be "color 3"', async function () {
    await open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
    await submit_form_func({
      page,
      form_params: [{
        selector: leave_type_edit_form_id + ' [data-tom-color-picker="1"][data-tom-leave-type-order="colour__1"] button.dropdown-toggle',
        dropdown_option: leave_type_edit_form_id + ' [data-tom-color-picker="1"][data-tom-leave-type-order="colour__1"] [data-tom-color-picker-css-class="leave_type_color_3"]'
      }],
      submit_button_selector: leave_type_edit_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/,
    })

    const ids = await page.$$eval('button.leavetype-remove-btn', l => l.map(e => e.value))
    leave_type_holiday_id = ids[0];
    leave_type_sick_id = ids[1];
  });

  it('Go Calendar page', function () {
    return open_page_func({
      url: application_host,
      page,
    })
  });

  it("Add absence: 2018-02-01 (afternoon) - 2018-02-02 (morning) Sick", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="3"]',
      }, {
        selector: 'input#from',
        value: '2018-02-01',
      }, {
        selector: 'select[name="to_date_part"]',
        option_selector: 'option[value="2"]',
      }, {
        selector: 'input#to',
        value: '2018-02-02',
      }, {
        selector: 'select#leave_type',
        option_selector: '[data-tom="Sick Leave"]'
      }],
      message: /New leave request was added/,
    }))
  });

  it("Add absence: 2018-02-02 (afternoon) - 2018-02-02 (afternnon) : Holiday", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="3"]',
      }, {
        selector: 'input#from',
        value: '2018-02-02',
      }, {
        selector: 'select[name="to_date_part"]',
        option_selector: 'option[value="3"]',
      }, {
        selector: 'input#to',
        value: '2018-02-02',
      }, {
        selector: 'select#leave_type',
        option_selector: '[data-tom="Holiday"]'
      }],
      message: /New leave request was added/,
      submit_button_selector: '#book_leave_modal button[type="submit"]'
    }))
  });

  it("Add absence: 2018-02-08 (morning) - 2018-02-08 (morning) : Holiday (0.5 days)", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
      }, {
        selector: 'input#from',
        value: '2018-02-08',
      }, {
        selector: 'select[name="to_date_part"]',
        option_selector: 'option[value="2"]',
      }, {
        selector: 'input#to',
        value: '2018-02-08',
      }, {
        selector: 'select#leave_type',
        option_selector: '[data-tom="Holiday"]'
      }],
      message: /New leave request was added/,
      submit_button_selector: '#book_leave_modal button[type="submit"]'
    }))
  });

  it("Add absence: 2018-02-13 (afternoon) - 2018-02-14 (morning) : Sick", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="3"]',
      }, {
        selector: 'input#from',
        value: '2018-02-13',
      }, {
        selector: 'select[name="to_date_part"]',
        option_selector: 'option[value="2"]',
      }, {
        selector: 'input#to',
        value: '2018-02-14',
      }, {
        selector: 'select#leave_type',
        option_selector: '[data-tom="Sick Leave"]'
      }],
      message: /New leave request was added/,
      submit_button_selector: '#book_leave_modal button[type="submit"]'
    }))
  });

  it("Add absence: 2018-02-14 (afternoon) - 2018-02-15 (morning) : Holiday", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="3"]',
      }, {
        selector: 'input#from',
        value: '2018-02-14',
      }, {
        selector: 'select[name="to_date_part"]',
        option_selector: 'option[value="2"]',
      }, {
        selector: 'input#to',
        value: '2018-02-15',
      }, {
        selector: 'select#leave_type',
        option_selector: '[data-tom="Holiday"]'
      }],
      message: /New leave request was added/,
      submit_button_selector: '#book_leave_modal button[type="submit"]'
    }))
  });

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  });

  it("Ensure that all absences are approved", async function () {
    await Promise.all([
      page.waitForSelector('h1'),
      page.waitForNavigation(),
      page.click('tr[vpp] .btn-success')
    ])
    await Promise.all([
      page.waitForSelector('h1'),
      page.waitForNavigation(),
      page.click('tr[vpp] .btn-success')
    ])
    await Promise.all([
      page.waitForSelector('h1'),
      page.waitForNavigation(),
      page.click('tr[vpp] .btn-success')
    ])
    await Promise.all([
      page.waitForSelector('h1'),
      page.waitForNavigation(),
      page.click('tr[vpp] .btn-success')
    ])
    await Promise.all([
      page.waitForSelector('h1'),
      page.waitForNavigation(),
      page.click('tr[vpp] .btn-success')
    ])

  });

  it('Go to callendar page and ensure that all half days cells have correct color classes', async function () {
    await open_page_func({
      url: application_host + 'calendar/?year=2018&show_full_year=1',
      page,
    })

    // Check Feb 1
    let cls = await page.$('table.month_February td.calendar_cell.day_1.half_1st')
    expect(cls).not.to.match(/leave_type_color_/)

    cls = await page.$('table.month_February td.calendar_cell.day_1.half_2nd')
    expect(cls).not.to.match(/leave_type_color_3/)


    // Check Feb 2
    cls = await page.$('table.month_February td.calendar_cell.day_2.half_1st')
    expect(cls).not.to.match(/leave_type_color_3/)

    cls = await page.$('table.month_February td.calendar_cell.day_2.half_2nd')
    expect(cls).not.to.match(/leave_type_color_1/)

    // Check Feb 8
    cls = await page.$('table.month_February td.calendar_cell.day_8.half_1st')
    expect(cls).not.to.match(/leave_type_color_1/)

    cls = await page.$('table.month_February td.calendar_cell.day_8.half_2nd')
    expect(cls).not.to.match(/leave_type_color_/)

    // Check Feb 13
    cls = await page.$('table.month_February td.calendar_cell.day_13.half_1st')
    expect(cls).not.to.match(/leave_type_color_/)

    cls = await page.$('table.month_February td.calendar_cell.day_13.half_2nd')
    expect(cls).not.to.match(/leave_type_color_3/)

    // Check Feb 14
    cls = await page.$('table.month_February td.calendar_cell.day_14.half_1st')
    expect(cls).not.to.match(/leave_type_color_3/)

    cls = await page.$('table.month_February td.calendar_cell.day_14.half_2nd')
    expect(cls).not.to.match(/leave_type_color_1/)

    // Check Feb 15
    cls = await page.$('table.month_February td.calendar_cell.day_15.half_1st')
    expect(cls).not.to.match(/leave_type_color_1/)

    cls = await page.$('table.month_February td.calendar_cell.day_15.half_2nd')
    expect(cls).not.to.match(/leave_type_color_/)

  });

  it("Go to Team view page and ensure that all half a day cells have correct color classes", async function () {
    await open_page_func({
      url: application_host + 'calendar/teamview/?date=2018-02',
      page,
    })

    // Check Feb 1
    let cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_1.half_1st')
    expect(cls).not.to.match(/leave_type_color_/)

    cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_1.half_2nd')
    expect(cls).not.to.match(/leave_type_color_3/)

    // Check Feb 2
    cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_2.half_1st')
    expect(cls).not.to.match(/leave_type_color_3/)

    cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_2.half_2nd')
    expect(cls).not.to.match(/leave_type_color_1/)

    // Check Feb 8
    cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_8.half_1st')
    expect(cls).not.to.match(/leave_type_color_1/)

    cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_8.half_2nd')
    expect(cls).not.to.match(/leave_type_color_/)

    // Check Feb 13
    cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_13.half_1st')
    expect(cls).not.to.match(/leave_type_color_/)

    cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_13.half_2nd')
    expect(cls).not.to.match(/leave_type_color_3/)

    // Check Feb 14
    cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_14.half_1st')
    expect(cls).not.to.match(/leave_type_color_3/)

    cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_14.half_2nd')
    expect(cls).not.to.match(/leave_type_color_1/)

    // Check Feb 15
    cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_15.half_1st')
    expect(cls).not.to.match(/leave_type_color_1/)

    cls = await page.$('table.team-view-table tr[data-vpp-user-list-row="' + user_id + '"] td.calendar_cell.day_15.half_2nd')
    expect(cls).not.to.match(/leave_type_color_/)

  });

  it("On Team view page ensure that days deducted from allowance are stated correctly", async function () {
    await open_page_func({
      url: application_host + 'calendar/teamview/?date=2018-02',
      page,
    })

    const txt = await page.$eval(
      `tr[data-vpp-user-list-row="${user_id}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )
    expect(txt, 'Ensure that system shows 2 days as deducted')
      .to.be.eql('2');
  });

  it("Go to report page and for 2018-02 ensure that report contains correct summaries", async function () {
    await open_page_func({
      url: application_host + 'reports/allowancebytime/?start_date=2018-02&end_date=2018-02',
      page,
    })

    const tr = await page.$(`tr[data-vpp-user-list-row="${user_id}"]`)

    const allowance_str = await tr.$eval('[data-vpp-deducted-days="1"]', e => e.innerText.trim())
    const holiday_str = await tr.$eval(`[data-vpp-leave-type-id="${leave_type_holiday_id}"]`, e => e.innerText.trim())
    const sick_str = await tr.$eval(`[data-vpp-leave-type-id="${leave_type_sick_id}"]`, e => e.innerText.trim())

    expect([allowance_str, holiday_str, sick_str], 'Ensure that report shows correct deducted days')
      .to.be.deep.equal(['2', '2', '2'])

  });

  after(function () {
    return page.close()
  });

});
