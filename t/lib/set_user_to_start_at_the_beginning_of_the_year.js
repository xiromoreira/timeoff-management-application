
'use strict';

const
  openPageFunc = require('./open_page'),
  userInfoFunc = require('./user_info'),
  submitFormFunc = require('./submit_form'),
  config = require('./config'),
  moment = require('moment');

const getUserId = ({ userId, email, page }) => (!!userId)
  ? Promise.resolve(userId)
  : userInfoFunc({ email, page })
    .then(({ user: { id } }) => id);

module.exports = ({
  page, email,
  userId = null,
  year = moment.utc().year(),
  applicationHost = config.get_application_host(),
  overwriteDate = null,
}) =>
  getUserId({ userId, email, page })
    .then(userId => openPageFunc({
      page,
      url: `${applicationHost}users/edit/${userId}/`
    }))
    .then(() => submitFormFunc({
      page,
      form_params: [{
        selector: 'input#start_date_inp',
        value: (overwriteDate ? overwriteDate.format('YYYY-MM-DD') : `${year}-01-01`),
      }],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .* were updated/,
    }))
    .then(() => openPageFunc({
      page,
      url: applicationHost
    }))

