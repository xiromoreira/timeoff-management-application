
'use strict'

const
  expect = require('chai').expect,
  rp = require('request-promise'),
  registerNewUserFunc = require('../../lib/register_new_user'),
  openPageFunc = require('../../lib/open_page'),
  submitFormFunc = require('../../lib/submit_form'),
  checkElementsFunc = require('../../lib/check_elements'),
  config = require('../../lib/config'),
  applicationHost = config.get_application_host()

/*
 *  Scenario to go in this test:
 *    * Create new company
 *    * Navigate to API page and ensure the API is disable
 *    * Read the key and try to invoke the API with that key: ensure the end point
 *      is blocked
 *    * Enable the API and repeate the invokation above: ensure that now it is
 *      successful
 *    * Regenerate the API key
 *    * Ensure that old API key is not valid anymore
 *    * Ensure that newly renenerated API key works fine
 *    * Disable the API integration for current company
 *    * Ensure that API end points do not work anymore
 *
 * */

describe('Enable/disable Integration APIs', function () {

  this.timeout(config.get_execution_timeout())

  let page, oldToken, newToken, email

  it('Create new company', function () {
    return registerNewUserFunc({ applicationHost }).then(data => {
      ({ page, email } = data)
    })
  })

  it('Navigate to API page and ensure the API is disable', function () {
    return openPageFunc({
      page,
      url: `${applicationHost}settings/company/integration-api/`,
    }).then(() => checkElementsFunc({
      page,
      elements_to_check: [{
        selector: 'input[name="integration_api_enabled"]',
        tick: true,
        value: 'off',
      }]
    }))
  })

  it('Read the key and try to invoke the API with that key: ensure the end point is blocked', async function () {
    oldToken = await page.$('input#token-value').then(e => e.getProperty('value').then(p => p.jsonValue()))

    return rp(`${applicationHost}integration/v1/report/absence`, {
      method: 'GET',
      body: '{}',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${oldToken}`,
      },
    }).then(() => {
      // Expected error, but got success
      throw new Error('TOM_TEST')

    }).catch(error => {
      expect(error).not.to.be.equal('TOM_TEST', 'Ensure contrl flow did not go beyond the "rp"')
      expect(error.response.statusCode).to.be.equal(401, 'Ensure response code is correct')
    })

  })

  it('Enable the API and repeate the invokation above: ensure that now it is successful', async function () {
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

    const obj = await rp(`${applicationHost}integration/v1/report/absence`, {
      method: 'GET',
      body: '{}',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${oldToken}`,
      },
    }).then(JSON.parse)

    expect(obj[0].user.email).to.be.equal(email, 'Ensure that report conatins email of admin user')
  })

  it('Regenerate the API key', async function () {
    await openPageFunc({
      page,
      url: `${applicationHost}settings/company/integration-api/`,
    })
    await submitFormFunc({
      page,
      form_params: [],
      submit_button_selector: '#regenerate_token_btn',
      should_be_successful: true,
      message: /Settings were saved/,
    })

    newToken = await page.$('input#token-value').then(e => e.getProperty('value').then(v => v.jsonValue()))
  })

  it('Ensure that old API key is not valid anymore', function () {
    return rp(`${applicationHost}integration/v1/report/absence`, {
      method: 'GET',
      body: '{}',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${oldToken}`,
      },
    }).then(() => {
      // Expected error but got success
      throw new Error('TOM_TEST')

    }).catch(error => {
      expect(error).not.to.be.equal('TOM_TEST', 'Ensure contrl flow did not go beyond the "rp"')
      expect(error.response.statusCode).to.be.equal(401, 'Ensure response code is correct')
    })
  })

  it('Ensure that newly renenerated API key works fine', function () {
    return rp(`${applicationHost}integration/v1/report/absence`, {
      method: 'GET',
      body: '{}',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${newToken}`,
      },
    }).then(JSON.parse).then(obj => {
      expect(obj[0].user.email).to.be.equal(email, 'Ensure that report conatins email of admin user')
    })
  })

  it('Disable the API integration for current company', async function () {
    await openPageFunc({
      page,
      url: `${applicationHost}settings/company/integration-api/`,
    })
    await submitFormFunc({
      page,
      form_params: [{
        selector: 'input[name="integration_api_enabled"]',
        tick: true,
        value: 'off',
      }],
      submit_button_selector: '#save_settings_btn',
      should_be_successful: true,
      message: /Settings were saved/,
    })
  })

  it('Ensure that API end points do not work anymore', function () {
    return rp(`${applicationHost}integration/v1/report/absence`, {
      method: 'GET',
      body: '{}',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${newToken}`,
      },
    }).then(() => { throw new Error('TOM_TEST') })
      .catch(error => {
        expect(error).not.to.be.equal('TOM_TEST', 'Ensure contrl flow did not go beyond the "rp"')
        expect(error.response.statusCode).to.be.equal(401, 'Ensure response code is correct')
      })
  })

  after(function () {
    return page.close()
  })

})
