
'use strict';

const get_page = require('./get_page');

const expect = require('chai').expect;

const login_with_user_func = async function (args) {

  var application_host = args.application_host,
    user_email = args.user_email,
    password = args.password || '123456',
    should_fail = args.should_fail || false;

  const page = await get_page(args);

  // Make sure we are in desktop version
  // page.manage().window().setSize(1024, 768);

  await page.goto(application_host);
  await page.waitForSelector('h1');

  // Check that there is a login button
  await page.$eval('a[href="/login/"]', el => el.innerText)
    .then(text => expect(text).to.be.equal('Login'))

  // Click on Login button
  await page.click('a[href="/login/"]')

  await page.waitForSelector('h1')

  // Check that it is actually login page
  await page.$eval('h1', el => el.innerText)
    .then(txt => expect(txt).to.be.equal('Login'))

  // Fill login form
  await Promise.all([
    {
      selector: 'input[name="username"]',
      value: user_email,
    },
    {
      selector: 'input[name="password"]',
      value: password,
    }
  ].map(test_case => {
    return page.$eval(test_case.selector, (el, val) => el.value = val, test_case.value)
  }))

  // Submit login button
  await Promise.all([
    page.waitForNavigation(),
    page.click('#submit_login')
  ])


  if (should_fail) {

    const text = await page.$eval('div.alert-danger', el => el.innerText)
    expect(text).to.match(/Incorrect credentials/);

  } else {
    await page.waitForSelector('div.alert-success')

    // Make sure login was successful, check that we landed on user account page
    await page.title().then(title => {
      expect(title).to.be.equal('Calendar');
    })

    await page.$eval('div.alert-success', el => el.innerText)
      .then(text => {
        expect(text).to.match(/Welcome back/);
      })
  }


  // Go back to the front page and pass data to the caller
  await page.goto(application_host);
  return { page }
};

module.exports = login_with_user_func;
