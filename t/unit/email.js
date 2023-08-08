
'use strict';

var expect = require('chai').expect,
  Email = require('../../lib/email');

describe('Check Email', function () {

  it('Knows how to render and parse template', function () {
    return Email.promise_rendered_email_template({
      template_name: 'foobar',
      context: {
        user: {
          name: 'FOO'
        },
      },
    }).then(function (email) {

      expect(email.subject).to.be.equal('Email subject goes here');
      const trimmed = email.body.replaceAll(/<\/?[^>]+(>|$)/gi, "")
      expect(trimmed).to.include("Hello FOO.");

    });

  });
});

