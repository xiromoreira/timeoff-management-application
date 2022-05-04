
'use strict';

const
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  check_elements_func = require('../../lib/check_elements'),
  moment = require('moment'),
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  bankholiday_form_id = '#update_bankholiday_form',
  new_bankholiday_form_id = '#add_new_bank_holiday_form';


describe('CRUD for bank holidays', function () {
  let page;

  this.timeout(config.get_execution_timeout());

  it('Performing registration process', function () {
    return register_new_user_func({ application_host })
      .then((data) => {
        page = data.page;
      });
  });

  it("Open page with bank holidays", function () {
    return open_page_func({
      page,
      url: application_host + 'settings/bankholidays/?year=2015',
    })
  });

  it("Check if there are default bank holidays", function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: bankholiday_form_id + ' input[tom-test-hook="name__0"]',
        value: 'Early May bank holiday',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="date__0"]',
        value: '2015-05-04',
      }],
    })
  });

  it("Try to submit form with incorrect date", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: bankholiday_form_id + ' input[tom-test-hook="date__0"]',
        value: 'crap',
      }],
      submit_button_selector: bankholiday_form_id + ' button[type="submit"]',
      message: /New day for Early May bank holiday should be date/,
    })
  });

  it("Go back to current year page of bank holidays", () => {
    return open_page_func({
      page,
      url: `${application_host}settings/bankholidays/?year=${moment().year()}`,
    })
  });

  // But it was prevented and checked in previous test!? So no "crappy" input was accepted!
  // it("Check that after some crappy input was provided into the date, it falls back to the current date", function () {
  //   return check_elements_func({
  //     page,
  //     elements_to_check: [{
  //       selector: bankholiday_form_id + ' input[tom-test-hook="name__0"]',
  //       value: 'Early May bank holiday',
  //     }, {
  //       selector: bankholiday_form_id + ' input[tom-test-hook="date__0"]',
  //       value: moment().format('YYYY-MM-DD'),
  //     }],
  //   })

  // });

  // This test was updating the "crappy" entry, but it was not created so... IDK... if remove or leave it...
  // it("Update Early spring holiday to be 4th of May", async function () {
  //   return submit_form_func({
  //     page,
  //     form_params: [{
  //       selector: bankholiday_form_id + ' input[tom-test-hook="date__0"]',
  //       value: '2015-05-04',
  //     }],
  //     submit_button_selector: bankholiday_form_id + ' button[type="submit"]',
  //     message: /Changes to bank holidays were saved/,
  //   })
  // });

  it("Go back to 2015", function () {
    return open_page_func({
      page,
      url: application_host + 'settings/bankholidays/?year=2015',
    })
  });

  it("Add new bank holiday to be in the beginning of the list", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 500)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_bank_holiday_btn')
    ])

    return Promise.all([
      page.waitForNetworkIdle(),
      submit_form_func({
        page,
        form_params: [{
          selector: new_bankholiday_form_id + ' input[name="name__new"]',
          value: 'Z New Year',
        }, {
          selector: new_bankholiday_form_id + ' input[name="date__new"]',
          value: '2015-01-01',
        }],
        submit_button_selector: new_bankholiday_form_id + ' button[type="submit"]',
        message: /Changes to bank holidays were saved/,
      })
    ])

  });

  it("Add new bank holiday to be in the end of the list", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 500)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_bank_holiday_btn')
    ])

    return submit_form_func({
      page,
      form_params: [{
        selector: new_bankholiday_form_id + ' input[name="name__new"]',
        value: 'Xmas',
      }, {
        selector: new_bankholiday_form_id + ' input[name="date__new"]',
        value: '2015-12-25',
      }],
      submit_button_selector: new_bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/,
    })

  });

  it("Check that the order of all three holidays is based on dates rather than names", function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: bankholiday_form_id + ' input[tom-test-hook="name__0"]',
        value: 'Z New Year',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="date__0"]',
        value: '2015-01-01',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="name__1"]',
        value: 'Early May bank holiday',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="date__1"]',
        value: '2015-05-04',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="name__2"]',
        value: 'Xmas',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="date__2"]',
        value: '2015-12-25',
      }],
    })

  });

  it("Rename Christmas to have proper name", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: bankholiday_form_id + ' input[tom-test-hook="name__2"]',
        value: 'Christmas',
      }],
      elements_to_check: [{
        selector: bankholiday_form_id + ' input[tom-test-hook="name__2"]',
        value: 'Christmas',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="date__2"]',
        value: '2015-12-25',
      }],
      should_be_successful: true,
      submit_button_selector: bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/,
    })

  });

  it("Remove Spring bank holiday", function () {
    return submit_form_func({
      page,
      submit_button_selector: bankholiday_form_id + ' button[tom-test-hook="remove__1"]',
      message: /Bank holiday was successfully removed/,
      should_be_successful: true,
      elements_to_check: [{
        selector: bankholiday_form_id + ' input[tom-test-hook="name__0"]',
        value: 'Z New Year',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="date__0"]',
        value: '2015-01-01',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="name__1"]',
        value: 'Christmas',
      }, {
        selector: bankholiday_form_id + ' input[tom-test-hook="date__1"]',
        value: '2015-12-25',
      }],
    })

  });

  after(function () {
    return page.close()
  });

});
