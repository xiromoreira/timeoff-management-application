'use strict';

const expect = require('chai').expect;

var logout_user_func = async function (args) {

  const application_host = args.application_host
  const page = args.page
  const logout_link_css_selector = 'li.hidden-xs a[href="/logout/"]'

  await page.goto(application_host);
  await page.click('a#me_menu')
  await page.waitForSelector(logout_link_css_selector);
  await page.click(logout_link_css_selector);
  await page.waitForSelector('body');
  // Check that there is no more Logout link
  const el = await page.$(logout_link_css_selector)
  expect(el).to.be.null
  return { page }

};


module.exports = logout_user_func

