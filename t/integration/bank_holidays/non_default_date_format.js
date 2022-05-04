
"use strict"

const
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  expect = require('chai').expect,
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  bankholiday_form_id = '#update_bankholiday_form',
  new_bankholiday_form_id = '#add_new_bank_holiday_form'

/*
 * This is a regressiopn for https://github.com/timeoff-management/application/issues/103
 *
 * The scenario:
 *
 *  * create new company with non-default date format
 *  * ensure that there are no bank holidays for the account
 *  * add thee bank holidays on 1 Jan, 2, Jan and 1 May
 *  * edit labels for newly added holidays
 *  * and make sure that dates were not changes as part of the update
 *
 * */

describe('Try to manage Bank holidays with non-default date format', function () {

  this.timeout(config.get_execution_timeout())

  var page

  it('Register new company and ensure it has non-default date format', function () {
    return register_new_user_func({
      application_host,
      default_date_format: 'DD/MM/YYYY',
    }).then(data => {
      page = data.page
    })
  })

  it("Open page with bank holidays", function () {
    return open_page_func({
      page,
      url: application_host + 'settings/bankholidays/?year=2015',
    })
  })

  it("Remove default predefined bank holidays", function () {
    return submit_form_func({
      page,
      message: /Bank holiday was successfully removed/,
      submit_button_selector: bankholiday_form_id + ' button[tom-test-hook="remove__0"]',
    })
  })

  it("And make sure that no bank holidays are shown", function () {
    return page.$eval('div.tst-no-bank-holidays', e => e.innerText)
      .then(txt => expect(txt).to.exist)
  })

  it("Add New year", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_bank_holiday_btn')
    ])

    await submit_form_func({
      page,
      form_params: [{
        selector: new_bankholiday_form_id + ' input[name="name__new"]',
        value: 'New Year',
      }, {
        selector: new_bankholiday_form_id + ' input[name="date__new"]',
        value: '01/01/2015',
      }],
      submit_button_selector: new_bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/,
    })

  })

  it("Add Second day of New year", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_bank_holiday_btn')
    ])

    return submit_form_func({
      page,
      form_params: [{
        selector: new_bankholiday_form_id + ' input[name="name__new"]',
        value: 'Second day of New Year',
      }, {
        selector: new_bankholiday_form_id + ' input[name="date__new"]',
        value: '02/01/2015',
      }],
      submit_button_selector: new_bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/,
    })
  })

  it("Add Add Labour day", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_bank_holiday_btn')
    ])

    return submit_form_func({
      page,
      form_params: [{
        selector: new_bankholiday_form_id + ' input[name="name__new"]',
        value: 'Labour day',
      }, {
        selector: new_bankholiday_form_id + ' input[name="date__new"]',
        value: '01/05/2015',
      }],
      submit_button_selector: new_bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/,
    })

  })

  it("Rename Christmas to have proper name", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: bankholiday_form_id + ' input[tom-test-hook="name__0"]',
        value: 'NOTHING',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="name__1"]',
        value: 'NOTHING',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="name__2"]',
        value: 'NOTHING',
      }],
      elements_to_check: [{
        selector: bankholiday_form_id + ' input[tom-test-hook="date__0"]',
        value: '01/01/2015',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="date__1"]',
        value: '02/01/2015',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="date__2"]',
        value: '01/05/2015',
      }],
      submit_button_selector: bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/,
      should_be_successful: true,
    })
  })

  after(function () {
    return page.close()
  })

})


describe("Try to use DD/MM/YY and some missleading date", function () {

  this.timeout(config.get_execution_timeout())

  var page

  it("Register new company with default date to be DD/MM/YY", function () {
    return register_new_user_func({
      application_host,
      default_date_format: 'DD/MM/YY',
    }).then(data => {
      page = data.page
    })
  })

  it("Open page with bank holidays", function () {
    return open_page_func({
      page,
      url: application_host + 'settings/bankholidays/',
    })
  })

  it("Try to add new bank holiday with date that was reported to be problematic", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_bank_holiday_btn')
    ])

    return submit_form_func({
      page,
      form_params: [{
        selector: new_bankholiday_form_id + ' input[name="name__new"]',
        value: 'Problematic date',
      }, {
        selector: new_bankholiday_form_id + ' input[name="date__new"]',
        value: '22/08/17',
      }],
      submit_button_selector: new_bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/,
    })

  })

  after(function () {
    return page.close()
  })

})
