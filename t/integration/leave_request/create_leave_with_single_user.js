
'use strict'

const
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  moment = require('moment'),
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  check_booking_func = require('../../lib/check_booking_on_calendar'),
  userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')


/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Submit leave request for new user
 *    - Make sure that leave request is shown as a pending one for admin user
 *
 *  There was a bug when in newly created company user (when there is only one account)
 *  tried to create new leave request.
 *
 * */

describe('Leave request with single user', function () {

  this.timeout(config.get_execution_timeout())

  let new_user_email, page

  it('Create new company', function () {
    return register_new_user_func({ application_host }).then((data) => {
      ({ page, email: new_user_email } = data)
    })
  })

  it("Ensure user starts at the very beginning of current year", function () {
    return userStartsAtTheBeginingOfYear({ page, email: new_user_email, year: 2015 })
  })

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      page,
    })
  })

  it("Open page to create new leave", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  })

  it("Create new leave request", function () {
    return submit_form_func({
      page,
      // The order matters here as we need to populate dropdown prior date filds
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
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

  after(function () {
    return page.close()
  })
})
