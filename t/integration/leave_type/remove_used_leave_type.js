
'use strict'

const
  moment = require('moment'),
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  check_booking_func = require('../../lib/check_booking_on_calendar'),
  leave_type_edit_form_id = '#leave_type_edit_form',
  leave_type_new_form_id = '#leave_type_new_form',
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Create new leave type (one tath is always at the start of list, e.g. AAA)
 *    - Create pended leave for that type
 *    - Try to remove the type
 *    - Ensure system prevent of doing this
 *
 * */

describe('Try to remove used leave type', function () {

  this.timeout(config.get_execution_timeout())

  var page, email

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      ({ page, email } = data)
    })
  })

  it("Ensure user starts at the very beginning of current year", function () {
    return userStartsAtTheBeginingOfYear({ page, email, year: 2015 })
  })

  it("Open page with leave types", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  })

  it("Add new leave type", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_leave_type_btn')
    ])
    await new Promise(res => setTimeout(res, 500))
    return submit_form_func({
      page,
      form_params: [{
        selector: leave_type_new_form_id + ' input[name="name__new"]',
        value: 'AAAAA',
      }, {
        selector: leave_type_new_form_id + ' input[name="use_allowance__new"]',
        value: 'on',
        tick: true,
      }],
      submit_button_selector: leave_type_new_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/,
    })
  })

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      page,
    })
  })

  it("Request new leave", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
    return submit_form_func({
      page,
      // The order matters here as we need to populate dropdown prior date filds
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
      }, {
        selector: 'select[name="leave_type"]',
        option_selector: 'option[data-tom-index="0"]',
      }, {
        selector: 'input#from',
        value: '2015-06-15',
      }, {
        selector: 'input#to',
        value: '2015-06-16',
      }],
      message: /New leave request was added/,
    })
  })

  it("Check that all days are marked as pended", function () {
    return check_booking_func({
      page,
      full_days: [moment('2015-06-16')],
      halfs_1st_days: [moment('2015-06-15')],
      type: 'pended',
    })
  })

  it("Open page with leave types", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  })

  it("Try to remove newly added leave type and ensure it fails", function () {
    return submit_form_func({
      page,
      submit_button_selector: leave_type_edit_form_id + ' button[data-tom-leave-type-order="remove_0"]',
      message: /Cannot remove leave type: type is in use/,
    })
  })

  after(function () {
    return page.close()
  })

})
