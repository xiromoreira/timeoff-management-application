
'use strict'

const
  register_new_user_func = require('../lib/register_new_user'),
  open_page_func = require('../lib/open_page'),
  submit_form_func = require('../lib/submit_form'),
  config = require('../lib/config'),
  application_host = config.get_application_host(),
  expect = require('chai').expect,
  moment = require('moment'),
  company_edit_form_id = '#company_edit_form',
  userStartsAtTheBeginingOfYear = require('../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 *  Basic scenario for checking time zones:
 *
 *  * Create a company
 *  * Update Time zone to be somethng in Tonga
 *  * Get the date from Book leave modal and put it into today_tonga
 *  * Get the current date from Calendar page and ensure it is the same as today_tonga
 *  * Get the current date from Team view page and ensure it is the same as today_tonga
 *  * Book a leave and ensure its "created at" value on My requests page is today_tonga
 *  * Reject newly added leave
 *  * Update Time zone to be Pacific/Midway
 *  * Get the date from Book leave modal and put it into today_usa
 *  * Ensure that today_usa is one day behind the today_tonga
 *  * Get the current date from Calendar page and ensure it is the same as today_usa
 *  * Get the current date from Team view page and ensure it is the same as today_usa
 *  * Book a leave and ensure its "created at" value on My requests page is today_usa
 *
 * */

describe('Check Time zones', function () {
  let
    page,
    user_email,
    today_usa,
    today_tonga

  this.timeout(config.get_execution_timeout())

  it("Create a company", function () {
    return register_new_user_func({
      application_host,
    })
      .then(data => {
        page = data.page
        user_email = data.email
      })
  })

  it("Ensure user starts at the very beginning of current year", function () {
    return userStartsAtTheBeginingOfYear({ page, email: user_email })
      .then(() => open_page_func({ url: application_host, page }))
  })

  it("Open page for editing company details", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  })

  it("Update Time zone to be somethng in Tonga", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: company_edit_form_id + ' select[name="timezone"]',
        option_selector: 'option[value="Pacific/Tongatapu"]',
        value: 'Pacific/Tongatapu',
      }],
      submit_button_selector: company_edit_form_id + ' button[type="submit"]',
      message: /successfully/i,
      should_be_successful: true,
    })
  })

  it("Get the date from Book leave modal and put it into today_tonga variable", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn'),
    ])
    // // This is very important line when working with Bootstrap modals! (not so much...)
    // await timeoutPromise(1000)
    today_tonga = await page.$eval('input.book-leave-from-input', e => e.value)
  })

  it("Get the current date from Calendar page and ensure it is the same as today_tonga", async function () {
    await open_page_func({
      page,
      url: application_host + 'calendar/',
    })
    const selector = 'table.month_' + moment(today_tonga).format('MMMM')
      + ' td.half_1st.day_' + moment(today_tonga).format('D') + '.current_day_cell'
    const el = await page.$(selector)
    expect(el != null, 'Ensure that current date is marked correctly').to.exist
  })

  it("Get the current date from Team view page and ensure it is the same as today_tonga", async function () {
    await open_page_func({
      page,
      url: application_host + 'calendar/teamview/',
    })
    const selector = 'table.team-view-table td.half_1st.day_' + moment(today_tonga).format('D') + '.current_day_cell'
    const el = await page.$(selector)
    expect(el, 'Ensure that current date is marked correctly').to.exist

    const month_caption = await page.$eval('div.calendar-section-caption', e => e.innerText.trim())
    expect(month_caption, 'Ensure month is correct').to.be.eql(moment(today_tonga).format('MMMM, YYYY'))
  })

  it("Open Book leave popup window", async function () {
    await page.click('#book_time_off_btn')
    // This is very important line when working with Bootstrap modals! (sic)
    await timeoutPromise(1000)
  })

  it("Submit new leave request", function () {
    return submit_form_func({
      page,
      form_params: [],
      message: /New leave request was added/,
    })
  })

  it('Ensure its "created at" value on My requests page is today_tonga', async function () {
    await open_page_func({
      url: application_host + 'requests/',
      page,
    })
    const text = await page.$eval('tr[vpp="pending_for__' + user_email + '"] td.date_of_request', e => e.innerText.trim())
    expect(text).to.be.eql(moment(today_tonga).format('YYYY-MM-DD'))
  })

  it('Reject newly added leave', function () {
    return page.click('tr[vpp="pending_for__' + user_email + '"] input[value="Reject"]')
  })

  it("Open page for editing company details", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  })

  it("Update Time zone to be Pacific/Midway", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: company_edit_form_id + ' select[name="timezone"]',
        option_selector: 'option[value="Pacific/Midway"]',
        value: 'Pacific/Midway',
      }],
      submit_button_selector: company_edit_form_id + ' button[type="submit"]',
      message: /successfully/i,
      should_be_successful: true,
    })
  })

  it("Get the date from Book leave modal and put it into today_usa", async function () {
    await page.click('#book_time_off_btn')
    await timeoutPromise(1000)
    today_usa = await page.$eval('input.book-leave-from-input', e => e.value)
  })

  it("Ensure that today_usa is one day behind the today_tonga", function () {
    expect(moment(today_usa).format('YYYY-MM-DD')).to.be.not.eql(moment(today_tonga).format('YYYY-MM-DD'))
  })

  it("Get the current date from Calendar page and ensure it is the same as today_usa", async function () {
    await open_page_func({
      url: application_host + 'calendar/',
      page,
    })
    const selector = 'table.month_' + moment(today_usa).format('MMMM')
      + ' td.half_1st.day_' + moment(today_usa).format('D') + '.current_day_cell'
    const el = await page.$(selector)
    expect(el, 'Ensure that current date is marked correctly').to.exist
  })

  it("Get the current date from Team view page and ensure it is the same as today_usa", async function () {
    await open_page_func({
      url: application_host + 'calendar/teamview/',
      page,
    })
    let el = await page.$('table.team-view-table td.half_1st.day_' + moment(today_usa).format('D') + '.current_day_cell')
    expect(el, 'Ensure that current date is marked correctly').to.exist

    const month_caption = await page.$eval('div.calendar-section-caption', e => e.innerText.trim())
    expect(month_caption, 'Ensure month is correct').to.be.eql(moment(today_usa).format('MMMM, YYYY'))
  })

  it("Open Book leave popup window", function () {
    return page.click('#book_time_off_btn')
      // This is very important line when working with Bootstrap modals! (yes, again -.-')
      .then(() => timeoutPromise(1000))
  })

  it("Submit new leave request", function () {
    return submit_form_func({
      page,
      form_params: [],
      message: /New leave request was added/,
    })
  })

  it('Ensure its "created at" value on My requests page is today_usa', async function () {
    await open_page_func({
      url: application_host + 'requests/',
      page,
    })
    const text = await page.$eval('tr[vpp="pending_for__' + user_email + '"] td.date_of_request', e => e.innerText.trim())
    expect(text).to.be.eql(moment(today_usa).format('YYYY-MM-DD'))
  })

  after(function () {
    return page.close()
  })

})

const timeoutPromise = (ms = 1000) => new Promise(res => setTimeout(res, ms))