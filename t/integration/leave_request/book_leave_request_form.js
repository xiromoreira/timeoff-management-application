
'use strict'

var
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  moment = require('moment'),
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  check_elements_func = require('../../lib/check_elements')

describe("Check the client side logic to facilitate filling new absence form", function () {

  this.timeout(config.get_execution_timeout())

  var page

  it("Register new company", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page
    })
  })

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?year=2017&show_full_year=1',
      page,
    })
  })

  it("Open Book new leave pop up window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  })

  it("Ensure by default FROM and TO fields are populated with current date", function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'input.book-leave-from-input',
        value: moment().format('YYYY-MM-DD'),
      }, {
        selector: 'input.book-leave-to-input',
        value: moment().format('YYYY-MM-DD'),
      }],
    })
  })

  it("Update FROM to be in future and make sure TO is automatically adjusted to the same date", async function () {
    const tomorrow_str = moment().add(1, 'days').format('YYYY-MM-DD')

    await new Promise(res => setTimeout(res, 500))
    await page.$eval('input.book-leave-from-input', e => e.value = '')
    await page.type('input.book-leave-from-input', tomorrow_str, { delay: 20 })

    await check_elements_func({
      page,
      elements_to_check: [{
        selector: 'input.book-leave-from-input',
        value: tomorrow_str,
      }, {
        selector: 'input.book-leave-to-input',
        value: tomorrow_str,
      }],
    })

  })


  it("Update FROM to be in past and make sure TO is stays unchanged", async function () {
    var
      tomorrow_str = moment().add(1, 'days').format('YYYY-MM-DD'),
      yesterday_str = moment().subtract(1, 'days').format('YYYY-MM-DD')

    await page.$eval('input.book-leave-from-input', e => e.value = '')
    await page.type('input.book-leave-from-input', yesterday_str)

    await check_elements_func({
      page,
      elements_to_check: [{
        selector: 'input.book-leave-from-input',
        value: yesterday_str,
      }, {
        selector: 'input.book-leave-to-input',
        value: tomorrow_str,
      }],
    })
  })

  after(function () {
    return page.close()
  })

})
