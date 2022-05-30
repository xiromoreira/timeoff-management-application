/*

*/

'use strict';

const get_page = require('./get_page');

var expect = require('chai').expect,
  company_edit_form_id = '#company_edit_form',
  submit_form_func = require('./submit_form');


async function register_new_user_func(args) {

  var
    application_host = args.application_host || args.applicationHost,
    failing_error_message = args.failing_error_message,
    default_date_format = args.default_date_format,
    random_token = (new Date()).getTime(),
    new_user_email = args.user_email || random_token + '@test.com';

  // Instantiate new page object if it not provided as paramater
  // var page = args.page || build_page()


  // Make sure we are in desktop version
  // page.manage().window().setSize(1024, 768);

  const page = await get_page(args);

  // Go to front page
  await page.goto(application_host)

  await page.waitForSelector('h1', 1000);

  // Check if there is a registration link
  await page.$eval('a[href="/register/"]', (el) => {
    return el.innerText;
  }).then((text) => {
    expect(text).to.match(/Register new company/i);
  })

  // Click on registration link
  await Promise.all([
    page.waitForNavigation(),
    page.waitForSelector('h1'),
    page.click('a[href="/register/"]')
  ])

  // Make sure that new page is a registration page
  await page.$eval('h1', el => el.innerText).then(ee =>
    expect(ee).to.be.equal('New company')
  )

  await submit_form_func({
    page,
    form_params: [{
      selector: 'input[name="company_name"]',
      value: 'Company ' + (new Date()).getTime(),
    }, {
      selector: 'input[name="name"]',
      value: 'name' + random_token,
    }, {
      selector: 'input[name="lastname"]',
      value: 'lastname' + random_token,
    }, {
      selector: 'input[name="email"]',
      value: new_user_email,
    }, {
      selector: 'input[name="password"]',
      value: '123456',
    }, {
      selector: 'input[name="password_confirmed"]',
      value: '123456',
    }, {
      selector: 'select[name="country"]',
      option_selector: 'option[value="ZZ"]',
    }],
    submit_button_selector: '#submit_registration',
  });

  await page.waitForSelector('div')

  if (failing_error_message) {

    await page.$eval('div.alert-danger', el => el.innerText)
      .then(text => expect(text).to.be.equal(failing_error_message))

  } else {

    // Make sure registration completed successfully
    await page.$eval('div.alert-success', el => el.innerText)
      .then(text => expect(text).to.be.equal('Registration is complete.'))
  }

  if (default_date_format) {

    // open company general configuration page and set the default format to be as requested
    await page.goto(application_host + 'settings/general/')

    // update company to use provided date format as a default
    await submit_form_func({
      page,
      form_params: [{
        selector: company_edit_form_id + ' select[name="date_format"]',
        option_selector: 'option[value="' + default_date_format + '"]',
        value: default_date_format,
      }],
      submit_button_selector: company_edit_form_id + ' button[type="submit"]',
      message: /successfully/i,
      should_be_successful: true,
    });

  }

  // Pass data back to the caller
  return {
    page,
    email: new_user_email,
  }

}

module.exports = register_new_user_func;
