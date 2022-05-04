'use strict';

var expect = require('chai').expect


const submit_form_func = async function (args) {

  var page = args.page,
    // Regex to check the message that is shown after form is submitted
    message = args.message || /.*/,
    // Array of object that have at least two keys: selector - css selector
    // and value - value to be entered
    form_params = args.form_params || [],

    // Indicate if message to be searched through all messages shown,
    // bu defaul it looks into firts message only
    multi_line_message = args.multi_line_message || false,

    // Indicates if there is a confirmation dialog
    confirm_dialog = args.confirm_dialog || false,

    // CSS selecetor for form submition button
    submit_button_selector = args.submit_button_selector || 'button[type="submit"]';

  for (const test_case of form_params) {
    // Handle case when test case is empty
    if (Object.keys(test_case).length === 0) {
      continue
    }

    if (test_case.hasOwnProperty('option_selector')) {
      const value = await page.$eval(
        test_case.selector + ' ' + test_case.option_selector,
        e => e.value)
      await page.$eval(test_case.selector, (e, v) => e.value = v, value)
    } else if (test_case.hasOwnProperty('tick')) {
      await page.click(test_case.selector)
    } else if (test_case.file) {
      const el = await page.$(test_case.selector)
      await el.uploadFile(test_case.value)
    } else if (test_case.hasOwnProperty('dropdown_option')) {
      await page.click(test_case.selector)
      await page.click(test_case.dropdown_option)
    } else {
      // Prevent the browser validations to allow backend validations to occur
      await page.$eval(test_case.selector, (el, test_case) => {
        if (test_case.change_step) {
          el.step = '0.1';
        }

        el.value = test_case.value;
      }, test_case);
    }
  }

  // Accept the confirm dialog
  if (confirm_dialog) {
    await page.evaluate(() => window.confirm = function (msg) { return true; });
  }

  // Submit the form
  await Promise.all([
    page.waitForNavigation(),
    page.click(submit_button_selector)
  ])

  // Check that message is as expected
  if (multi_line_message) {
    return page.$$eval('div.alert', els => {
      return els.map(el => el.innerText)
    }).then(texts => {
      expect(
        texts.some(text => message.test(text))
      ).to.be.equal(true);

      return { page };
    });

  } else {

    const text = await page.$eval('div.alert', el => el.innerText)
    expect(text).to.match(message)

    return { page };
  }
};


module.exports = submit_form_func;
