

'use strict';

var
  config = require('../lib/config'),
  application_host = config.get_application_host(),
  expect = require('chai').expect,
  register_new_user_func = require('../lib/register_new_user'),
  open_page_func = require('../lib/open_page');

/*
  At this moment there is a bug when anyone can hijack acount if primary email
  is known.

  Scenario to check:
    * create new account
    * try to openregister page
    ** system showl redirect to page

*/

describe('Try to open registeration page with active user in a session', function () {

  this.timeout(config.get_execution_timeout());

  var admin_email, page;

  it("Create new company", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
    });
  });

  it('Try to open Registration page', function () {
    return open_page_func({
      page,
      url: application_host + 'register/',
    })
  });

  it("Make sure that user is landed on calendar page", function () {
    expect(page.url()).to.be.equal(application_host + 'calendar/')
  });

  after(function () {
    return page.close()
  });

});
