
'use strict'

const
  expect = require('chai').expect,
  registerNewUserFunc = require('../../lib/register_new_user'),
  config = require('../../lib/config'),
  openPageFunc = require('../../lib/open_page'),
  submitFormFunc = require('../../lib/submit_form'),
  userInfoFunc = require('../../lib/user_info'),
  applicationHost = config.get_application_host(),
  companyEditFormId = '#company_edit_form',
  userStartsAtTheBeginingOfYear = require('../../lib/set_user_to_start_at_the_beginning_of_the_year')

/*
 * Scenario:
 *
 *  * Create a company
 *  * Ensure that newly added user starts at the very begining
 *  * Ensure user does not have anything carried over from previous year
 *  * Update copany configuration to carry over all unused allowance from previous year
 *  * Recalculate carried over allowance for the company
 *  * Ensure that newly created user's carried over still remains 0
 *
 * */

describe('Carry over issue for users started in current year', function () {

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

  it("Update admin details to have start date at very beginig of this year", function () {
    return userStartsAtTheBeginingOfYear({ page, email })
  })

  it('Open user details page (abcenses section)', function () {
    return openPageFunc({
      page,
      url: `${applicationHost}users/edit/${userId}/absences/`,
    })
  })

  it('Ensure user does not have anything carried over from previous year', async function () {
    const text = await page.$eval('#allowanceCarriedOverPart', e => e.innerText.trim())
    expect(text).to.be.eq('0')
  })

  it('Update copany configuration to carry over all unused allowance from previous year', async function () {
    await openPageFunc({
      page,
      url: `${applicationHost}settings/general/`,
    })
    return submitFormFunc({
      page,
      form_params: [{
        selector: `${companyEditFormId} select[name="carry_over"]`,
        option_selector: 'option[value="1000"]',
        value: '1000',
      }],
      submit_button_selector: `${companyEditFormId} button[type="submit"]`,
      message: /successfully/i,
      should_be_successful: true,
    })
  })

  it('Recalculate carried over allowance for the company', function () {
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
