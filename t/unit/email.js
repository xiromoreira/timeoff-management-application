
'use strict';

var expect = require('chai').expect,
  Email = require('../../lib/email');

describe('Check Email', function () {

  it('Knows how to render and parse template', function () {
    var email = new Email();

    return Promise.resolve(email.promise_rendered_email_template({
      template_name: 'foobar',
      context: {
        user: {
          name: 'FOO',
          reload_with_session_details: function () { Promise.resolve(1); },
        },
      },
    })).then(function (email) {

      expect(email.subject).to.be.equal('Email subject goes here');
      expect(email.body).to.match(/Hello FOO\./);

    });

  });
});

