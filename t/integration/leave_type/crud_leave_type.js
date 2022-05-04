
'use strict'

const
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  check_elements_func = require('../../lib/check_elements'),
  config = require('../../lib/config'),
  expect = require('chai').expect,
  application_host = config.get_application_host(),
  leave_type_edit_form_id = '#leave_type_edit_form',
  leave_type_new_form_id = '#leave_type_new_form'


describe('CRUD for leave types', function () {
  var page

  this.timeout(config.get_execution_timeout())

  it("Performing registration process", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page
    })
  })

  it("Open page with leave types", function () {
    return open_page_func({
      url: application_host + 'settings/general/',
      page,
    })
  })

  it("Check if there are default leave types", function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_0"]',
        value: 'Holiday',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_1"]',
        value: 'Sick Leave',
      }],
    })
  })

  it("Make sure default colours are set for leave types", async function () {
    const els = await page.$$(
      'form#leave_type_edit_form [data-tom-color-picker]',
    )
    expect(els.length, "Ensure number of colour pickers is the same as leave types")
      .to.be.equal(2)

    const colours = await Promise.all(els.map(el => el.$eval('input[type="hidden"]', e => e.value)))
    expect(colours.sort(), 'Check default colour values')
      .to.be.deep.equal(['leave_type_color_1', 'leave_type_color_1'])
  })

  it("Change Sick leave type to be non-default colour", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: leave_type_edit_form_id + ' [data-tom-color-picker="1"][data-tom-leave-type-order="colour__1"] button.dropdown-toggle',
        dropdown_option: leave_type_edit_form_id + ' [data-tom-color-picker="1"][data-tom-leave-type-order="colour__1"] [data-tom-color-picker-css-class="leave_type_color_2"]'
      }],
      submit_button_selector: leave_type_edit_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/,
    })
  })

  it('Ensure that color class for Sick days was updated to be non-default', async function () {
    const colours = await page.$$eval(
      'form#leave_type_edit_form [data-tom-color-picker] input[type="hidden"]',
      l => l.map(e => e.value)
    )
    expect(colours.sort(), 'Check default colour values')
      .to.be.deep.equal(['leave_type_color_1', 'leave_type_color_2'])
  })

  it('Make sure that both leave types have "use allowance" tick boxes set', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="allowance_0"]',
        tick: true,
        value: 'on',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="allowance_1"]',
        tick: true,
        value: 'off',
      }],
    })
  })

  it('Check that updating "use allowance flag" works', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="allowance_1"]',
        tick: true,
        value: 'on',
      }],
      should_be_successful: true,
      submit_button_selector: leave_type_edit_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/,
    })
  })

  it('Double check that "use allowance" tick boxes were updated correctly', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="allowance_0"]',
        value: 'on',
        tick: true,
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="allowance_1"]',
        value: 'on',
        tick: true,
      }],
    })
  })

  it("Check that it is possible to update Limits", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="limit_0"]',
        value: '0',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="limit_1"]',
        value: '5',
      }],
      submit_button_selector: leave_type_edit_form_id + ' button[type="submit"]',
      should_be_successful: true,
      message: /Changes to leave types were saved/,
    })
  })

  it("Make sure that Limit cannot be negative", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="limit_0"]',
        value: '-1',
      }],
      submit_button_selector: leave_type_edit_form_id + ' button[type="submit"]',
      message: /New limit for .* should be positive number or 0/,
    })
  })

  it("Add new leave type", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.waitForSelector(leave_type_new_form_id + ' input[name="use_allowance__new"]'),
      page.click('#add_new_leave_type_btn')
    ])
    await new Promise(res => setTimeout(res, 500))

    return submit_form_func({
      page,
      form_params: [{
        selector: leave_type_new_form_id + ' input[name="name__new"]',
        value: 'AAAAA',
      }, {
        selector: leave_type_new_form_id + ' input[name="use_allowance__new"]',
        value: 'on',
        tick: true,
      }],
      submit_button_selector: leave_type_new_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/,
    })
  })

  it('Check that new leave type was added at the beginning of the list as it starts with "A"', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_0"]',
        value: 'AAAAA',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_1"]',
        value: 'Holiday',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_2"]',
        value: 'Sick Leave',
      }],
    })
  })

  it('And rename newly added leave type to start with "M"', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_0"]',
        value: 'MM',
      }],
      submit_button_selector: leave_type_edit_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/,
    })
  })

  it("Make sure that updated new leave type was moved into second position", function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_0"]',
        value: 'Holiday',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_1"]',
        value: 'MM',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_2"]',
        value: 'Sick Leave',
      }],
    })
  })

  it("Remove empty newly added leave type", function () {
    return submit_form_func({
      page,
      elements_to_check: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_0"]',
        value: 'Holiday',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_1"]',
        value: 'Sick Leave',
      }],
      submit_button_selector: leave_type_edit_form_id + ' button[data-tom-leave-type-order="remove_1"]',
      message: /Leave type was successfully removed/,
    })
  })

  it("And make sure only two old leave types are left", function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_0"]',
        value: 'Holiday',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_1"]',
        value: 'Sick Leave',
      }],
    })
  })

  it("Add AAA and ZZZ leave types", async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_leave_type_btn')
    ])
    await new Promise(res => setTimeout(res, 500))
    await submit_form_func({
      page,
      form_params: [{
        selector: leave_type_new_form_id + ' input[name="name__new"]',
        value: 'ZZZ',
      }, {
        selector: leave_type_new_form_id + ' input[name="use_allowance__new"]',
        value: 'on',
        tick: true,
      }],
      submit_button_selector: leave_type_new_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/,
    })

    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_leave_type_btn')
    ])
    await new Promise(res => setTimeout(res, 500))
    await submit_form_func({
      page,
      form_params: [{
        selector: leave_type_new_form_id + ' input[name="name__new"]',
        value: 'AAA',
      }, {
        selector: leave_type_new_form_id + ' input[name="use_allowance__new"]',
        value: 'on',
        tick: true,
      }],
      submit_button_selector: leave_type_new_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/,
    })
  })

  it("Ensure AAA is first and ZZZ is last in the list (general settings page)", function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_0"]',
        value: 'AAA',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_1"]',
        value: 'Holiday',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_2"]',
        value: 'Sick Leave',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_3"]',
        value: 'ZZZ',
      }],
    })
  })

  it("Ensure AAA is a first and ZZZ is a last in a list on book holiday modal", async function () {
    const option_infos = await page.$$eval(
      'select#leave_type option',
      l => l.map(e => ({
        value: e.getAttribute('data-tom-index'),
        text: e.getAttribute('data-tom')
      }))
    )
    expect(option_infos[0], 'AAA is first').to.include({ value: '0', text: 'AAA' })
    expect(option_infos[3], 'ZZZ is last').to.include({ value: '3', text: 'ZZZ' })
  })

  it('Mark ZZZ as one to be default one', async function () {
    const name = await page.$eval(
      leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_3"]',
      e => e.getAttribute('name'))

    const id = name.split('__')[1]

    await submit_form_func({
      page,
      form_params: [{
        selector: leave_type_edit_form_id + ' input[type="radio"][value="' + id + '"]',
        tick: true,
        value: 'on',
      }],
      submit_button_selector: leave_type_edit_form_id + ' button[type="submit"]',
      message: /Changes to leave types were saved/,
    })
  })

  it("Ensure AAA is first and ZZZ is last in the list (general settings page)", function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_0"]',
        value: 'AAA',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_1"]',
        value: 'Holiday',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_2"]',
        value: 'Sick Leave',
      }, {
        selector: leave_type_edit_form_id + ' input[data-tom-leave-type-order="name_3"]',
        value: 'ZZZ',
      }],
    })
  })

  it("Ensure ZZZ is a first and AAA is a second in a list on book holiday modal", async function () {
    const option_infos = await page.$$eval(
      'select#leave_type option',
      l => l.map(e => ({
        value: e.getAttribute('data-tom-index'),
        text: e.getAttribute('data-tom')
      }))
    )
    expect(option_infos[0], 'ZZZ is first').to.include({ value: '0', text: 'ZZZ' })
    expect(option_infos[1], 'AAA is last').to.include({ value: '1', text: 'AAA' })
  })

  after(function () {
    return page.close()
  })
})
