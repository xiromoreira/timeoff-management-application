
/*
 * For given email fetch user account info using provided page
 * where an client side JS is used to trigger AJAX request to
 * server. Make sure that drivier has active admin session.
 *
 * */

'use strict';

// Function that is executed on the client,
// it relies on presence of jQuery and window.VPP_email
const func_to_inject = function () {
  return new Promise(resolve => {
    $.ajax({
      url: '/users/search/',
      type: 'post',
      data: {
        email: window.VPP_email,
      },
      headers: {
        Accept: "application/json",
      },
      dataType: 'json',
      success: resolve,
    });
  })
};


const user_info_func = async function (args) {

  var
    page = args.page,
    email = args.email;

  if (!page) {
    throw "'page' was not passed into the user_info!";
  }

  if (!email) {
    throw "'email' was not passed into the user_info!";
  }

  // Inject email we are using to identify user into the tested page
  await page.evaluate('window.VPP_email = "' + email + '";')
  const users = await page.evaluate(func_to_inject)
  const user = users.length > 0 ? users[0] : {}

  return {
    user
  }

}

module.exports = user_info_func
