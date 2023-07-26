
/*
 *  Module to encapsulate logic for passport instantiation used for
 *  authentication.
 *
 *  Exports function that return instance of passport object.
 *
 * */

'use strict';

const
  model     = require('../model/db'),
  passport      = require('passport'),
  Promise       = require('bluebird'),
  LocalStrategy = require('passport-local').Strategy,
  BearerStrategy= require('passport-http-bearer').Strategy,
  getCompanyAdminByToken = require('./getCompanyAdminByToken');

// In case if user is successfully logged in, make sure it is
// activated
function prepare_user_for_session(args) {
  var user = args.user,
      done = args.done;

  user.maybe_activate()
    .then(function(user){
      return user.reload_with_session_details();
    })
    .then(function(){
      done(null, user);
    });
}

module.exports = function(){

  passport.use(new BearerStrategy((token, done) => {
    getCompanyAdminByToken({ token, model })
    .then(user => user.reload_with_session_details())
    .then(user => done(null, user))
    .catch(error => {
      console.log(`Failed to authenticate TOKEN. Reason: '${error}'`);
      done(null, false);
    });
  }));

  // Define how user object is going to be flattered into session
  // after request is processed.
  // In session store we save only user ID
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  // Defines how the user object is restored based on data saved
  // in session storage.
  // Fetch user data from DB based on ID.
  passport.deserializeUser(function(id, done) {

    model.User.findOne({where : {id : id}}).then(user =>
      user.reload_with_session_details()
    )
    .then(function(user){
      done(null, user);
    })
    .catch(function(error){
      console.error('Failed to fetch session user '+id+' with error: '+error);

      done(null, false, { message : 'Failed to fetch session user' });
    });
  });

  return passport;
};
