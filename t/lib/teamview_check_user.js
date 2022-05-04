
/*
 * Exports function that checks if given emails of users are shown
 * on the Teamview page. And if so how they are rendered: as text or link.
 *
 * It does not check exact emails, just count numbers.
 *
 * */

'use strict';

const expect = require('chai').expect
const open_page_func = require('./open_page')
const config = require('./config')

module.exports = async function (args) {

  var
    page = args.page,
    emails = args.emails || [],
    is_link = args.is_link || false,
    application_host = args.application_host || config.get_application_host();

  if (!page) {
    throw "'page' was not passed into the teamview_check_user!";
  }

  await open_page_func({
    url: application_host + 'calendar/teamview/',
    page,
  })

  const elements = await page.$$('tr.teamview-user-list-row > td.cross-link > ' + (is_link ? 'a' : 'span'))
  expect(elements.length).to.be.equal(emails.length);

  return { page }

};

