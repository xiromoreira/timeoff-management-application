
'use strict'

const
  expect = require('chai').expect,
  rp = require('request-promise'),
  registerNewUserFunc = require('../../lib/register_new_user'),
  openPageFunc = require('../../lib/open_page'),
  submitFormFunc = require('../../lib/submit_form'),
  userInfoFunc = require('../../lib/user_info'),
  addNewUserFunc = require('../../lib/add_new_user'),
  config = require('../../lib/config'),
  applicationHost = config.get_application_host()

/*
 * Scenario:
 *
 *   * Create new company
 *   * Enable API integration
 *   * Navigate to current user details and update its Name and Surname
 *   * Add second user
 *   * Remove second user
 *   * Fetch the Audit feed from integration API and ensure that
 *     users details manipulations were captured
 *
 * */

describe('Basic audit for user changes', function () {

  this.timeout(config.get_execution_timeout())

  let page, token, email, userId, secondEmail, secondUserId

  it('Create new company', function () {
    return registerNewUserFunc({ applicationHost })
      .then(data => {
        ({ page, email } = data)
        return userInfoFunc({ page, email })
      })
      .then(data => (userId = data.user.id))
  })

  it('Enable API integration and capture the token value', async function () {
    await openPageFunc({
      page,
      url: `${applicationHost}settings/company/integration-api/`,
    })
    await submitFormFunc({
      page,
      form_params: [{
        selector: 'input[name="integration_api_enabled"]',
        tick: true,
        value: 'on',
      }],
      submit_button_selector: '#save_settings_btn',
      should_be_successful: true,
      message: /Settings were saved/,
    })

    token = await page.$('input#token-value').then(e => e.getProperty('value').then(p => p.jsonValue()))
  })

  it('Navigate to current user details and update its Name and Surname', async function () {
    await openPageFunc({
      page,
      url: `${applicationHost}users/edit/${userId}/`,
    })
    return submitFormFunc({
      page,
      form_params: [{
        selector: 'input[name="name"]',
        value: 'NewAuditName',
      }, {
        selector: 'input[name="lastname"]',
        value: 'NewAuditLastName',
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .* were updated/,
    })
  })

  it("Create second user", async function () {
    let data = await addNewUserFunc({
      application_host: applicationHost,
      page,
    })
    secondEmail = data.new_user_email

    data = await userInfoFunc({ page, email: secondEmail })
    secondUserId = data.user.id
  })

  it("Remove second account", async function () {
    await openPageFunc({
      url: `${applicationHost}users/edit/${secondUserId}/`,
      page,
    })
    return submitFormFunc({
      submit_button_selector: 'button#remove_btn',
      message: /Employee records were removed from the system/,
      page,
      confirm_dialog: true,
    })
  })

  it('Fetch the Audit feed from integration API', async function () {
    const obj = await rp(`${applicationHost}integration/v1/audit`, {
      method: 'GET',
      body: '{}',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    }).then(JSON.parse)

    const twoEvents = obj
      .filter(i => i.entityType === 'USER')
      .filter(i => i.entityId === userId)

    expect(twoEvents.length).to.be.eql(2)

    expect(twoEvents.map(i => i.attribute).join(',')).to.be.eql('name,lastname')
    expect(twoEvents.map(i => i.newValue).join(',')).to.be.eql('NewAuditName,NewAuditLastName')

    const removedEvents = obj
      .filter(i => i.entityType === 'USER')
      .filter(i => i.entityId === secondUserId)

    expect(removedEvents.length, 'There records regarding user deletion')
      .to.be.above(0)
    expect(removedEvents.filter(i => i.newValue === 'null').length, 'all of them are nulls')
      .to.be.eql(removedEvents.length)

  })

  after(function () {
    return page.close()
  })
})
