
'use strict'

const
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  company_edit_form_id = '#company_edit_form'


describe('Edit company details', function () {
  var page

  this.timeout(config.get_execution_timeout())

  it("Performing registration process", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page
    })
  })

  it("Open page for editing company details", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  })

  it("Check that company is been updated if valid values are submitted", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: company_edit_form_id + ' input[name="name"]',
        value: 'Test companu ltd',
      }, {
        selector: company_edit_form_id + ' select[name="country"]',
        option_selector: 'option[value="US"]',
        value: 'US',
      }],
      submit_button_selector: company_edit_form_id + ' button[type="submit"]',
      message: /successfully/i,
      should_be_successful: true,
    })
  })

  after(function () {
    return page.close()
  })

})
