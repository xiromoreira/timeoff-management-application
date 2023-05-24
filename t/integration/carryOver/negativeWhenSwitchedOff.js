
'use strict'

const
  expect = require('chai').expect,
  moment = require('moment'),
  registerNewUserFunc = require('../../lib/register_new_user'),
  checkElementsFunc = require('../../lib/check_elements'),
  config = require('../../lib/config'),
  openPageFunc = require('../../lib/open_page'),
  submitFormFunc = require('../../lib/submit_form'),
  userInfoFunc = require('../../lib/user_info'),
  applicationHost = config.get_application_host(),
  companyEditFormId = '#company_edit_form',
  departmentEditFormId = '#department_edit_form',
  userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 * Scenario:
 *  * Create new company
 *  * Amend its user to started at the very begining of last year
 *  * Add and approve week long leave in last year
 *  * Adjust user's deparment's allpwance to be 1 day
 *  * Ensure that company has Carry Over set to be 'None'
 *  * Calculate carry over
 *  * Ensure that newly created user's carried over still remains 0
 *
 * */

describe('No negative allowance is carried overs', function () {

  this.timeout(config.get_execution_timeout())

  let page, email, userId

  it("Register new company", function () {
    return registerNewUserFunc({ applicationHost })
      .then(data => {
        ({ page, email } = data)
      })
  })

  it("Obtain information about admin user", function () {
    return userInfoFunc({ page, email })
      .then(data => {
        userId = data.user.id
      })
  })

  it("Amend its user to started at the very begining of last year", function () {
    return userStartsAtTheBeginingOfYear({
      page, email,
      overwriteDate: moment.utc().add(-1, 'y').startOf('year'),
    })
  })

  it('Update user to have her leaves be auto apporved', function () {
    return openPageFunc({
      page,
      url: `${applicationHost}users/edit/${userId}/`,
    })
      .then(() => submitFormFunc({
        page,
        form_params: [{
          selector: 'input[name="auto_approve"]',
          tick: true,
          value: 'on',
        }],
        submit_button_selector: 'button#save_changes_btn',
        message: /Details for .+ were updated/,
      }))
  })

  it("Add and approve week long leave in last year", async function () {
    const lastYear = moment.utc().add(-1, 'y').year()
    await openPageFunc({ page, url: applicationHost })
    await Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
    return submitFormFunc({
      page,
      form_params: [{
        selector: 'input#from',
        value: `${lastYear}-06-01`,
      }, {
        selector: 'input#to',
        value: `${lastYear}-06-08`,
      }],
      message: /New leave request was added/,
    })
  })

  it("Adjust user's deparment's allpwance to be 1 day", async function () {
    await openPageFunc({
      page,
      url: `${applicationHost}settings/departments/`,
    })
    await Promise.all([
      page.waitForNavigation(),
      page.click('a[href*="/settings/departments/edit/"]')
    ])
    await submitFormFunc({
      page,
      form_params: [{
        selector: `${departmentEditFormId} select[name="allowance"]`,
        option_selector: 'option[value="1"]',
        value: '1',
      }],
      submit_button_selector: `${departmentEditFormId} button[type="submit"]`,
      message: /Department .* was updated/,
      should_be_successful: true,
    })
  })

  it('Ensure that nominal allowance was reduced to 1', async function () {
    await openPageFunc({
      page,
      url: `${applicationHost}users/edit/${userId}/absences/`,
    })
    const text = await page.$eval('#nominalAllowancePart', e => e.innerText.trim())
    expect(text).to.be.eq('1')
  })

  it('Ensure that company has Carry Over set to be "None"', async function () {
    await openPageFunc({
      page,
      url: `${applicationHost}settings/general/`,
    })
    await checkElementsFunc({
      page,
      elements_to_check: [{
        selector: `${companyEditFormId} select[name="carry_over"]`,
        value: '0',
      }],
    })
  })

  it('Calculate carry over', function () {
    return submitFormFunc({
      page,
      submit_button_selector: '#calculate_carry_over_form button[type="submit"]',
      message: /allowance was successfully carried over/i,
      should_be_successful: true,
    })
  })

  it("Ensure that newly created user's carried over still remains 0", async function () {
    await openPageFunc({
      page,
      url: `${applicationHost}users/edit/${userId}/absences/`,
    })
    const text = await page.$eval('#allowanceCarriedOverPart', e => e.innerText.trim())
    expect(text).to.be.eq('0')
  })

  after(function () {
    return page.close()
  })
})
