
'use strict';

const
  register_new_user_func = require('../lib/register_new_user'),
  open_page_func = require('../lib/open_page'),
  submit_form_func = require('../lib/submit_form'),
  config = require('../lib/config'),
  application_host = config.get_application_host();

describe("Try to use non defaul date formats for editing employee details", function () {

  this.timeout(config.get_execution_timeout());

  var page;

  it("Register new company with default date to be DD/MM/YY", function () {
    return register_new_user_func({
      application_host,
      default_date_format: 'DD/MM/YY',
    }).then(data => {
      page = data.page;
    });
  });

  it("Open employee list page", function () {
    return open_page_func({
      page,
      url: application_host + 'users/',
    })
  });

  it("Open employee details page", function () {
    return Promise.all([
      page.waitForNavigation(),
      page.click('td.user-link-cell a'),
    ])
  });

  it("Update Start date to be date that was reportedly problematic", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#start_date_inp',
        value: '22/08/17',
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .* were updated/,
      //      should_be_successful : true,
    })
  });

  after(function () {
    return page.close()
  });

});
