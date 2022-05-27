
'use strict'

var
  register_new_user_func = require('../../lib/register_new_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  check_elements_func = require('../../lib/check_elements'),
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  expect = require('chai').expect,
  add_new_user_func = require('../../lib/add_new_user'),
  user_info_func = require('../../lib/user_info'),
  new_department_form_id = '#add_new_department_form',
  department_edit_form_id = '#department_edit_form'

/*
 *  Scenario:
 *    * register new account
 *    * check that /settings/departments/ page shows readonly list of departments
 *    * ensure that the list of departments has links for every department
 *    ** to edit department
 *    ** see details of its manager
 *    ** there is a link to Bulk department update page
 *    * create new department by pressing "Add new department" button on the /settings/departments/ page
 *    ** ensure that user is landed on department read only list page
 *    ** use A as a name and ensure it appears in the begining of the list
 *    * create another new department starting with "Z"
 *    ** ensure that it is located at the end of the list
 *
 * */

describe('Check departments list page', function () {
  var page

  this.timeout(config.get_execution_timeout())

  it("Register new account", function () {
    return register_new_user_func({
      application_host,
    }).then((data) => {
      page = data.page
    })
  })

  it("Open page with department list and ensure it has read-only list", async function () {
    await open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
    const inputs = await page.$$('tr[data-vpp-department-list-mode="readonly"]')
    expect(inputs.length).to.be.eql(1)
  })

  it("Ensure list of departments has links for editing each individual one", async function () {
    const links = await page.$$('a[href*="/settings/departments/edit/"]')
    expect(links.length).to.be.eql(2, "We expect to have two edit links per department")
  })

  it("Ensure department has a link to its Manager edit page", async function () {
    const links = await page.$$('a[href*="/users/edit/"]')
    expect(links.length).to.be.eql(1, "There exist one link to manager per department")

    const href = await links[0].getProperty('href').then(v => v.jsonValue())
    expect(href).to.match(/\/users\/edit\/\d+\/$/, "Link to manager indeed contains ID")
  })

  it('Add new "AAA" department', async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_department_btn')
    ])
    return submit_form_func({
      page,
      form_params: [{
        selector: new_department_form_id + ' input[name="name__new"]',
        value: 'AAA',
      }, {
        selector: new_department_form_id + ' select[name="allowance__new"]',
        option_selector: 'option[value="15"]',
        value: '15',
      }],
      submit_button_selector: new_department_form_id + ' button[type="submit"]',
      message: /Changes to departments were saved/,
    })
  })

  it('Ensure that user is landed on department read only list page', function () {
    expect(page.url()).to.match(/\/settings\/departments\/$/, 'Ensure the landing page is department list')
  })

  it('Ensure that newly added department AAA is on top of the list', async function () {
    const texts = await page.$$eval('a[data-vpp-department-name="1"]', els => els.map(e => e.text))
    expect(texts).to.have.eql(['AAA', 'Sales'], 'Check the order of names')
  })

  it('Add new "ZZZ" department', async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_department_btn')
    ])
    return submit_form_func({
      page,
      form_params: [{
        selector: new_department_form_id + ' input[name="name__new"]',
        value: 'ZZZ',
      }, {
        selector: new_department_form_id + ' select[name="allowance__new"]',
        option_selector: 'option[value="15"]',
        value: '15',
      }],
      submit_button_selector: new_department_form_id + ' button[type="submit"]',
      message: /Changes to departments were saved/,
    })
  })

  it('Ensure that departments respect alphabetical order', async function () {
    const texts = await page.$$eval('a[data-vpp-department-name="1"]', els => els.map(e => e.text))
    expect(texts).to.have.eql(['AAA', 'Sales', 'ZZZ'], 'Check the order of names')
  })

  after(function () {
    return page.close()
  })
})

/*
 *  Scenario:
 *    * create new company account
 *    * create additional user B
 *    * go to existing department
 *    * try to edit name, manager - to be user B, allowance to be 5 and tick the "include public holidays" checkbox
 *    * ensure user stays on the department edit oage after changes were saved
 *    * try to remove the department by pressing Delete button on current page
 *    ** ensure that system prevents form doint it complaining that there are people in this department
 *    * create new department and move both users A and B into it
 *
 *    * delete the original department and make sure it is gone
 *    * go to details of newly added department and check the link 'Employees from department'
 *
 * */

describe("Edit individual department via department details page", function () {
  var page, email_A, email_B, user_id_A, user_id_B, department_edit_page_url,
    new_department_id

  this.timeout(config.get_execution_timeout())

  it("Register new account", function () {
    return register_new_user_func({
      application_host,
    }).then((data) => {
      email_A = data.email
      page = data.page
    })
  })

  it("Create second user B", function () {
    return add_new_user_func({
      application_host, page,
    }).then((data) => {
      email_B = data.new_user_email
    })
  })

  it("Obtain information about user A", function () {
    return user_info_func({
      page,
      email: email_A,
    }).then((data) => {
      user_id_A = data.user.id
    })
  })

  it("Obtain information about user B", function () {
    return user_info_func({
      page,
      email: email_B,
    }).then((data) => {
      user_id_B = data.user.id
    })
  })

  it("Open page with department list and click first department in the list", async function () {
    await open_page_func({
      url: application_host + 'settings/departments/',
      page,
    })
    await page.click('a[href*="/settings/departments/edit/"]')
  })

  it('... save edit page URL', function () {
    department_edit_page_url = page.url()
  })

  it('Edit department', async function () {
    await page.waitForSelector(department_edit_form_id + ' button[type="submit"]')
    return submit_form_func({
      page,
      form_params: [{
        selector: department_edit_form_id + ' input[name="name"]',
        value: 'Fantastic name',
      }, {
        selector: department_edit_form_id + ' select[name="allowance"]',
        option_selector: 'option[value="5"]',
        value: '5',
      }, {
        selector: department_edit_form_id + ' select[name="boss_id"]',
        option_selector: 'option[value="' + user_id_B + '"]',
        value: user_id_B,
      }, {
        selector: 'input[name="include_public_holidays"]',
        tick: true,
        value: 'on',
      }],
      submit_button_selector: department_edit_form_id + ' button[type="submit"]',
      message: /Department .* was updated/,
    })
  })

  it('Ensure that chnages were applied', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: department_edit_form_id + ' input[name="name"]',
        value: 'Fantastic name',
      }, {
        selector: department_edit_form_id + ' select[name="allowance"]',
        option_selector: 'option[value="5"]',
        value: '5',
      }, {
        selector: department_edit_form_id + ' select[name="boss_id"]',
        option_selector: 'option[value="' + user_id_B + '"]',
        value: user_id_B + "",
      }, {
        selector: 'input[name="include_public_holidays"]',
        tick: false,
        value: 'off',
      }],
    })
  })

  it('Ensure that user stays on the same page after updating department details', function () {
    expect(page.url()).to.be.eql(department_edit_page_url)
  })

  it('Try to remove the department by pressing Delete button on current page', function () {
    return Promise.all([
      page.waitForNavigation(),
      page.click('button#remove_btn')
    ])
  })

  it('Ensure that system prevents deleting department', function () {
    return page.$eval('div.alert', e => e.innerText.trim()).then(txt =>
      expect(txt).to.match(
        /Cannot remove department .+ as it still has 2 users/,
        'App complains about non empty department'
      )
    )
  })

  it('Go to departments list by clicking on corresponding link', function () {
    return page.click('a[data-vpp-all-departments-link="1"]')
  })

  it('Add new "AAA" department', async function () {
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_department_btn')
    ])

    return submit_form_func({
      page,
      form_params: [{
        selector: new_department_form_id + ' input[name="name__new"]',
        value: 'AAA',
      }, {
        selector: new_department_form_id + ' select[name="allowance__new"]',
        option_selector: 'option[value="15"]',
        value: '15',
      }],
      submit_button_selector: new_department_form_id + ' button[type="submit"]',
      message: /Changes to departments were saved/,
    })
  })

  it('Fetch newly added department ID', function () {
    return page.$eval('a[data-vpp-department-name="1"]', e => e.href).then(href => {
      new_department_id = href.match(/settings\/departments\/edit\/(\d+)\//)[1]
      expect(new_department_id).to.match(/^\d+$/, 'The department ID is number')
    })
  })

  it("Open user A details page", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + user_id_A + '/',
      page,
    })
  })

  it('... and move her to newly added department', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="department"]',
        option_selector: 'option[value="' + new_department_id + '"]',
        value: new_department_id,
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .+ were updated/,
    })
  })

  it('Ensure that chnages were applied', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'select[name="department"]',
        value: new_department_id,
      }],
    })
  })

  it("Open user B details page", function () {
    return open_page_func({
      url: application_host + 'users/edit/' + user_id_B + '/',
      page,
    })
  })

  it('... and move her to newly added department', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="department"]',
        option_selector: 'option[value="' + new_department_id + '"]',
        value: new_department_id,
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .+ were updated/,
    })
  })

  it('Ensure that chnages were applied', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'select[name="department"]',
        value: new_department_id,
      }],
    })
  })

  it('Go to the very first department details page', function () {
    return open_page_func({
      url: department_edit_page_url,
      page,
    })
  })

  it('Remove the department by pressing Delete button', async function () {
    await Promise.all([
      page.waitForNavigation(),
      page.click('button#remove_btn')
    ])
    return page.$eval('div.alert', div => div.innerText.trim()).then(txt =>
      expect(txt).to.match(/Department was successfully removed/)
    )
  })

  it('Ensure that we have landed on correct page', function () {
    expect(page.url()).to.match(/\/settings\/departments\/$/, 'The URL points to departments page')
  })

  after(function () {
    return page.close()
  })
})

/*
 *  Scenario (edditing secondary supervisers)
 *  * create new account with user A
 *  * go to departments details page and invoke "add secondary supervisors"
 *    popup window, ensure it has link to "Add new employee" page
 *  * create two additional users B and C
 *  * go to any department details page and ensure that user A is its manager
 *  * ensure that "secondary supervisors" section is empty
 *  * click "add supervisers" button and ensure that popup witndow
 *    has only user B and C in the list
 *  * tick user B and save changes
 *  * observe that user B appeares on the list of secondary supervisers
 *  * open "add supervisors" pop up again and ensure that user B has tick
 *    next to it and user C does not have it
 *  * tick user C and un-tick user B and save changes
 *  * observe that "secondary spervisors" section now contains only user C
 *  * Click on "Remove" button next to user C and observe that it disappeares
 *    from "secondary supervisors" section after page is reloaded
 *
 * */

describe('CRUD for department secondary supervisers', function () {

  var page, email_A, email_B, email_C, user_id_A, user_id_B, user_id_C,
    department_edit_page_url

  this.timeout(config.get_execution_timeout())

  it("Register new account", function () {
    return register_new_user_func({
      application_host,
    }).then((data) => {
      email_A = data.email
      page = data.page
    })
  })

  it("Obtain information about user A", function () {
    return user_info_func({
      page,
      email: email_A,
    }).then((data) => {
      user_id_A = data.user.id
    })
  })

  it('Go to departments details page', function () {
    return open_page_func({
      url: application_host + 'settings/departments/',
      page,
    }).then(() =>
      page.click('a[href*="/settings/departments/edit/"]')
    )
  })

  it('... save edit page URL', function () {
    department_edit_page_url = page.url()
  })

  it('Invoke "Add secondary supervisers" pop-up window', async function () {
    await Promise.all([
      page.waitForSelector('a[data-vpp-add-supervisor-modal-add-new-user="1"]'),
      page.click('a[data-vpp-add-new-secondary-supervisor="1"]')
    ])
    return page.$eval('a[data-vpp-add-supervisor-modal-add-new-user="1"]', e => e.innerText.trim()).then(text =>
      expect(text).to.match(/Add new employee/)
    )
  })

  it("Create second user B", function () {
    return add_new_user_func({
      application_host, page,
    }).then((data) => {
      email_B = data.new_user_email
    })
  })

  it("Obtain information about user B", function () {
    return user_info_func({
      page,
      email: email_B,
    }).then((data) => {
      user_id_B = data.user.id
    })
  })


  it("Create second user C", function () {
    return add_new_user_func({
      application_host, page,
    }).then((data) => {
      email_C = data.new_user_email
    })
  })

  it("Obtain information about user C", function () {
    return user_info_func({
      page,
      email: email_C,
    }).then((data) => {
      user_id_C = data.user.id
    })
  })


  it('Go to any department details page', function () {
    return open_page_func({
      url: department_edit_page_url,
      page,
    })
  })

  it('... and ensure that user A is its manager', function () {
    return check_elements_func({
      page,
      elements_to_check: [{
        selector: 'select#manager_id',
        value: String(user_id_A),
      }],
    })
  })

  it('Ensure that "secondary supervisors" section is empty', function () {
    return page.$$('button[name="remove_supervisor_id"]').then(els =>
      expect(els.length).to.be.eql(0, 'No remove buttons for supervisers as there are not any')
    )
  })

  it('click "add supervisers" button and ensure that popup witndow ' +
    'has only user B and C in the list', async function () {
      await Promise.all([
        page.waitForSelector('input[name="supervisor_id"]'),
        page.click('a[data-vpp-add-new-secondary-supervisor="1"]')
      ])
      const els = await page.$$('input[name="supervisor_id"]')
      const vals = await Promise.all(els.map(e => e.getProperty('value').then(v => v.jsonValue())))
      expect(vals.sort()).to.be.eql([user_id_B, user_id_C].map(String).sort(), 'User list is expected')
    })

  it('tick user B and save changes', async function () {
    const selector = 'input[name="supervisor_id"][value="' + user_id_B + '"]'
    await Promise.all([
      page.waitForNetworkIdle(),
      page.waitForSelector(selector)
    ])
    return submit_form_func({
      page,
      form_params: [{
        selector,
        tick: true,
        value: 'on',
      }],
      submit_button_selector: 'button[name="do_add_supervisors"]',
      message: /Supervisors were added to department/,
    })
  })

  it('Observe that user B appeares on the list of secondary supervisers', async function () {
    const els = await page.$$('button[name="remove_supervisor_id"]')
    expect(els.length).to.be.eql(1, 'No remove buttons for supervisers as there are not any')

    const val = await els[0].getProperty('value').then(v => v.jsonValue())
    expect(val).to.be.eql(String(user_id_B), 'It is indeed user B')
  })

  it('Open "add supervisors" pop up again and ensure that user B has tick next to it and user C does not have it', async function () {
    await Promise.all([
      page.waitForSelector('input[name="supervisor_id"]'),
      page.click('a[data-vpp-add-new-secondary-supervisor="1"]')
    ])
    await check_elements_func({
      page,
      elements_to_check: [{
        selector: `input[name="supervisor_id"][value="${user_id_B}"]`,
        tick: true,
        value: 'on',
      }],
    })
    await check_elements_func({
      page,
      elements_to_check: [{
        selector: `input[name="supervisor_id"][value="${user_id_C}"]`,
        tick: true,
        value: 'off',
      }],
    })
  })

  it('Tick user C and un-tick user B and save changes', async function () {
    const selector1 = 'input[name="supervisor_id"][value="' + user_id_B + '"]'
    const selector2 = 'input[name="supervisor_id"][value="' + user_id_C + '"]'
    // race condition? "Node is either not clickable or not an HTMLElement"
    await new Promise(res => setTimeout(res, 500))
    return submit_form_func({
      page,
      form_params: [{
        selector: selector1,
        tick: true,
      }, {
        selector: selector2,
        tick: true,
      }],
      submit_button_selector: 'button[name="do_add_supervisors"]',
      message: /Supervisors were added to department/,
    })
  })

  it('Observe that "secondary spervisors" section now contains only user C', async function () {
    const els = await page.$$('button[name="remove_supervisor_id"]')
    expect(els.length).to.be.eql(1, 'No remove buttons for supervisers as there are not any')
    const val = await els[0].getProperty('value').then(v => v.jsonValue())
    expect(val).to.be.eql(String(user_id_C), 'It is indeed user C')
  })

  it('Click on "Remove" button next to user C and observe that it disappears from "secondary supervisors" ' +
    'section after page is reloaded', async function () {
      await Promise.all([
        page.waitForNavigation(),
        page.click(`button[name="remove_supervisor_id"][value="${user_id_C}"]`)
      ])

      const els = await page.$$('button[name="remove_supervisor_id"]')
      expect(els.length, 'There is no users in secondary supervisers section').to.be.eql(0)
    })

  after(function () {
    return page.close()
  })

})
