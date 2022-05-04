'use strict';

const
  expect = require('chai').expect,
  Promise = require("bluebird"),
  fs = Promise.promisifyAll(require('fs')),
  csv = Promise.promisifyAll(require('csv')),
  register_new_user_func = require('../lib/register_new_user'),
  login_user_func = require('../lib/login_with_user'),
  logout_user_func = require('../lib/logout_user'),
  open_page_func = require('../lib/open_page'),
  submit_form_func = require('../lib/submit_form'),
  config = require('../lib/config'),
  user_info_func = require('../lib/user_info'),
  application_host = config.get_application_host();

/*
 *  Scenario to check:
 *
 *    * Register new account
 *    * Create 10 unique emails/users
 *    * Put them into CSV and import in bulk
 *    * Ensure that all users were added into
 *      system and they appear on the Users page
 *    * Ensure that newly added users do not have password "undefined"
 *      (as it happened to be after bulk import feature went live)
 *
 * */


describe.skip('Bulk import of users', function () {

  this.timeout(config.get_execution_timeout());

  let page,
    csv_data,
    sample_email,
    test_users_filename = __dirname + '/test.csv';

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
    });
  });

  it('Navigate to bulk upload page', function () {
    return open_page_func({
      page,
      url: application_host + 'users/import/',
    })
  });

  it('Create test .CSV file for the test', function () {
    csv_data = [['email', 'name', 'lastname', 'department']];

    let token = (new Date()).getTime();
    for (let i = 0; i < 10; i++) {
      csv_data.push([
        'test_csv_' + i + '_' + token + '@test.com',
        'name_csv_' + i + '_' + token + '@test.com',
        'lastname_csv_' + i + '_' + token + '@test.com',
        'Sales'
      ]);
    }

    // Safe one of the emails
    sample_email = csv_data[1][0];

    return Promise.resolve()
      .then(() => fs.unlinkAsync(test_users_filename))
      .catch(err => Promise.resolve())
      .then(() => csv.stringifyAsync(csv_data))
      .then(data => fs.writeFileAsync(test_users_filename, data))
  });

  it('Upload user import file', function () {
    let regex = new RegExp(
      'Successfully imported users with following emails: '
      + csv_data.slice(1).map(it => it[0]).sort().join(', ')
    );

    return submit_form_func({
      page,
      submit_button_selector: '#submit_users_btn',
      form_params: [{
        selector: '#users_input_inp',
        value: test_users_filename,
        file: true,
      }],
      message: regex,
    })
  });

  it('Ensure that imported users are in the system', function () {
    let users_ids;
    // Get IDs of newly added users
    return Promise.map(csv_data.slice(1).map(it => it[0]), email => {
      return user_info_func({
        page,
        email: email,
      })
        .then(data => data.user.id);
    })
      // Open users page
      .then(ids => {
        users_ids = ids;

        return open_page_func({
          page,
          url: application_host + 'users/',
        });
      })

      // Ensure that IDs of newly added users are on th Users page
      .then(() => Promise.map(users_ids, id => page
        .$('[data-vpp-user-row="' + id + '"]').then(el => {
          expect(el, 'Ensure that newly added user ID ' + id + ' exists on Users page')
            .to.exists;
        })
      ))

  });

  it("Logout from admin account", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it('Now try to login as newly added employee using "undefined" as password..', function () {
    return login_user_func({
      page, application_host,
      user_email: sample_email,
      password: 'undefined',
      should_fail: true,
    })
  });

  after(function () {
    return Promise.resolve()
      .then(() => page.close())
      .then(() => fs.unlinkAsync(test_users_filename))
      .catch(() => Promise.resolve())
  });
});
