
'use strict';

const
  moment = require('moment'),
  register_new_user_func = require('../../lib/register_new_user'),
  submit_form_func = require('../../lib/submit_form'),
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year');

const nextYear = moment().add(1, 'y').format('YYYY');

/*
 *  Scenario to go in this test:
 *    - Create new company with admin user
 *    - Update user to start at the very end of current year: 20 Dec
 *    - Submit leave request for of one week day in next year
 *    - Make sure system allows it
 *
 * */

describe(`Leave in the next year (${nextYear}) when no allowance in the current one`, function () {

  this.timeout(config.get_execution_timeout());

  let email, page;

  it('Create new company', function () {
    return register_new_user_func({ application_host }).then(data => {
      ({ page, email } = data);
    });
  });

  it("Update user to start at the very end of current year: 20 Dec", function () {
    return userStartsAtTheBeginingOfYear({
      page, email,
      overwriteDate: moment.utc(`${nextYear - 1}-12-20`),
    })
  });

  it("Submit leave request for of one week in next year", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: `${nextYear}-01-05`,
      }, {
        selector: 'input#to',
        value: `${nextYear}-01-12`,
      }],
      message: /New leave request was added/,
    }))
  });

  after(function () {
    return page.close()
  });

});
