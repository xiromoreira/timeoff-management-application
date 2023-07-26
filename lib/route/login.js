
/*
 *  Contain handlers for dealing with user account:
 *      - login
 *      - logout
 *      - register
 *      - forget password
 *
 *  Module exports FUNCTION that create a router object,
 *  not the router itself!
 *  Exported function gets passport object.
 * */
'use strict';

var
  validator      = require('validator'),
  Promise        = require('bluebird'),
  fs             = require("fs"),
  config         = require('../config'),
  moment_tz      = require('moment-timezone'),
  EmailTransport = require('../email');
const { check_login, register_new_admin_user, hash_password } = require('./utils/auth');

Promise.promisifyAll(fs);

var get_url_to_site_root_for_anonymous_session = function(req) {
  return req.get('host').indexOf('app.timeoff') < 0
    ? '/'
    : config.get('promotion_website_domain');
}

module.exports = function() {

  var express = require('express');
  var router  = express.Router();

  router.get('/login', function(req, res){
      res.render('login', {
          allow_create_new_accounts: JSON.parse(config.get('allow_create_new_accounts')),
          title : 'Time Off Management',
          url_to_the_site_root : get_url_to_site_root_for_anonymous_session(req),
      });
  });

  router.post('/login', async function (req, res) {
    const user = await check_login(req.app.get('db_model'), req.body)
    if (!user) {
      req.session.flash_error('Incorrect credentials');
      return res.redirect_with_session('/login');
    }
    req.logIn(user, err => {
      if (!err) req.session.flash_message('Welcome back ' + user.name + '!');
      return res.redirect_with_session(res.locals.url_to_the_site_root);
    })
  });

  router.get('/logout', function(req, res){

      // Maybe this check is redundant but to be on safe side lets do it
      if ( !req.user ) {
          return res.redirect_with_session(303, '/');
      }

      req.logout();

      return res.redirect_with_session(res.locals.url_to_the_site_root);
  });

  router.get('/register', function(req, res){

      // Disable new accounts.
      if ( !JSON.parse(config.get('allow_create_new_accounts')) ) {
        return res.redirect_with_session(res.locals.url_to_the_site_root);
      }

      // There is no need to register new accounts when user already logged
      if ( req.user ) {
        return res.redirect_with_session(303, '/');
      }

      res.render('register',{
        url_to_the_site_root : get_url_to_site_root_for_anonymous_session(req),
        countries            : config.get('countries'),
        timezones_available  : moment_tz.tz.names(),
      });
  });

  router.post('/register', async function (req, res) {

    // There is no need to register new accounts when user alreeady logged
    // (just to prevent people to mess around)
    if (req.user) {
      return res.redirect_with_session(303, '/');
    }

    // TODO at some point we need to unified form validation code
    // and make it reusable

    let email = req.body['email'].toLowerCase()
    if (!email) {
      req.session.flash_error('Email was not provided');
    } else if (!validator.isEmail(email)) {
      req.session.flash_error('Email address is invalid');
    }

    let name = req.body['name'];
    if (!name) {
      req.session.flash_error('Name was not specified');
    }

    let lastname = req.body['lastname'];
    if (!lastname) {
      req.session.flash_error('Last was not specified');
    }

    const company_name = req.body['company_name'];

    let password = req.body['password'];
    if (!password) {
      req.session.flash_error('Password could not be blank');
    } else if (password !== req.body['password_confirmed']) {
      req.session.flash_error('Confirmed password does not match initial one');
    }

    let country_code = req.body['country'];
    if (!validator.matches(country_code, /^[a-z]{2}/i)) {
      req.session.flash_error('Incorrect country code');
    }

    let timezone = validator.trim(req.body['timezone']);
    if (!moment_tz.tz.names().find(tz_str => tz_str === timezone)) {
      req.session.flash_error('Time zone is unknown');
    }

    // In case of validation error redirect back to registration form
    if (req.session.flash_has_errors()) {
      return res.redirect_with_session('/register/');
    }

    try {

      const user = await register_new_admin_user(req.app.get('db_model'), {
        email: email.toLowerCase(),
        password, name, lastname, company_name, country_code, timezone,
      })

      const email_transport = new EmailTransport();
      await email_transport.promise_registration_email({ user });

      // Login newly created user
      req.logIn(user, err => {
        console.error(err)
        req.session.flash_message(
          'Registration is complete.'
        );
        res.redirect_with_session('/');
      })

    } catch (error) {
      console.error(
        'An error occurred when trying to register new user '
        + email + ' : ' + error
      );
      if (error.stack) console.log(error.stack)

      req.session.flash_error(
        'Failed to register user please contact customer service.' +
        (error.show_to_user ? ' ' + error : '')
      );

      return res.redirect_with_session('/register/');
    }

  });

  router.get('/forgot-password/', function(req, res){
    res.render('forgot_password',{
      url_to_the_site_root : get_url_to_site_root_for_anonymous_session(req),
    });
  });

  router.post('/forgot-password/', async (req, res) => {
    const email = req.body['email'];

    if (!email) {
      req.session.flash_error('Email was not provided');

    } else if (!validator.isEmail(email)) {
      req.session.flash_error('Email address is invalid');
    }

    // In case of validation error redirect back to forgot password form
    if (req.session.flash_has_errors()) {
      return res.redirect_with_session('./');
    }

    const success_msg = 'Please check your email box for further instructions';

    // Normalize email address: system operates only in low cased emails
    email = email.toLowerCase();

    const user = await req.app.get('db_model').User.find_by_email(email)
    if (!user) {
      req.session.flash_message(success_msg);
      return res.redirect_with_session('./');
    }

    try {
      await EmailTransport.send_forgot_password_email({ user });
      req.session.flash_message(success_msg);
      return res.redirect_with_session('./');

    } catch (error) {
      console.error('An error occurred while submittin forgot password form: ' + error);
      req.session.flash_error('Failed to proceed with submitted data.');
      return res.redirect_with_session('./');
    }

  });

  router.get('/reset-password/', function(req, res){

    var token = req.query['t'];

    req.app.get('db_model').User.get_user_by_reset_password_token(token)
      .then(function(user){
        if (! user) {
          req.session.flash_error('Unknown reset password link, please submit request again');
          return res.redirect_with_session('/forgot-password/')
        }

        res.render('reset_password',{
          url_to_the_site_root : get_url_to_site_root_for_anonymous_session(req),
          token : token,
        });
      });
  });

  router.post('/reset-password/', function(req, res){

    var token        = req.body['t'],
    password         = req.body['password'],
    confirm_password = req.body['confirm_password'];


    if (password !== confirm_password) {
      req.session.flash_error('Confirmed password does not match password');
      return res.redirect_with_session('/reset-password/?t='+token);
    }

    req.app.get('db_model').User.get_user_by_reset_password_token(token)
      .then(function(user){
        if (! user) {
          req.session.flash_error('Unknown reset password link, please submit request again');
          return res.redirect_with_session('/forgot-password/');
        }

        return Promise.resolve(user);
      })
      .then(function(user){
        user.password = hash_password(password);
        return user.save();
      })
      .then(function(user){
        var Email = new EmailTransport();

        return Email.promise_reset_password_email({
          user : user,
        });
      })
      .then(function(){
        req.session.flash_message('Please use new password to login into system');
          return res.redirect_with_session('/login/')
      });
  });

  return router;
};
