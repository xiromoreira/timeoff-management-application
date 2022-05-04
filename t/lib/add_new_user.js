'use strict';

var submit_form_func = require('./submit_form'),
    get_page = require('./get_page'),
    add_new_user_form_id = '#add_new_user_form';

module.exports = async function (args) {

  var application_host = args.application_host,
    department_index = args.department_index,
    // optional parameter, if provided the user adding action is expected to fail
    // with that error
    error_message = args.error_message

  const page = await get_page(args);

  var random_token = (new Date()).getTime();
  var new_user_email = args.email || random_token + '@test.com';

  // Open front page
  await page.goto(application_host + 'users/add/')

  var select_department = {};
  if (typeof department_index !== 'undefined') {

    select_department = {
      selector: 'select[name="department"]',
      option_selector: 'option[data-vpp="' + department_index + '"]',
    };
  }

  await submit_form_func({
    page,
    form_params: [
      {
        selector: add_new_user_form_id + ' input[name="name"]',
        value: 'name' + random_token,
      }, {
        selector: add_new_user_form_id + ' input[name="lastname"]',
        value: 'lastname' + random_token,
      }, {
        selector: add_new_user_form_id + ' input[name="email_address"]',
        value: new_user_email,
      }, {
        selector: add_new_user_form_id + ' input[name="password_one"]',
        value: '123456',
      }, {
        selector: add_new_user_form_id + ' input[name="password_confirm"]',
        value: '123456',
      },
      select_department, 
      {
        selector: add_new_user_form_id + ' input[name="start_date"]',
        value: '2015-06-01',
      },
    ],
    submit_button_selector: add_new_user_form_id + ' #add_new_user_btn',
    should_be_successful: error_message ? false : true,
    elements_to_check: [],
    message: error_message ?
      new RegExp(error_message) :
      /New user account successfully added/,
  });

  return {
    page, new_user_email
  }

};
