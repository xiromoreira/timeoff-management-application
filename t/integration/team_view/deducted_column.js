
'use strict';

/*
 *  Scenario:
 *
 *  Case when holidays spans through more then one month and is devided by bank holiday.
 *
 *    * create new account as admin user A
 *    * create user B
 *    * create new bank holiday to be on 2 Aug 2016
 *    * as user B create a holiday request from 28 July to morning of 4 Aug 2016 (a)
 *    * as user B create a holiday request from 12 Aug to 15 Aug 2016 (b)
 *    * as user B create a holiday request from 26 Aug to 2 Sep 2016 (d)
 *    * as user B create a sick day request from 18 to 18 Aug 2016 (e)
 *    * as user A approve leaves (a), (b), (d), and (e)
 *    * as user B cretae a holiday request from 24 Aug to 24 Aug 2016 (c)
 *    * navigate to team view and ensure that it shows 9 days were deducted for Aug 2016
 *    * 1.5 days deducted for July 2016
 *    * 2 days deducted for Sept 2016
 *
 * */

const
  expect = require('chai').expect,
  add_new_user_func = require('../../lib/add_new_user'),
  config = require('../../lib/config'),
  login_user_func = require('../../lib/login_with_user'),
  logout_user_func = require('../../lib/logout_user'),
  open_page_func = require('../../lib/open_page'),
  register_new_user_func = require('../../lib/register_new_user'),
  submit_form_func = require('../../lib/submit_form'),
  user_info_func = require('../../lib/user_info'),
  new_bankholiday_form_id = '#add_new_bank_holiday_form',
  application_host = config.get_application_host();

describe('Case when holidays spans through more then one month and is devided by bank holiday', function () {

  this.timeout(config.get_execution_timeout());

  let page,
    email_A, user_id_A,
    email_B, user_id_B;

  it("Register new company as admin user A", function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page;
      email_A = data.email;
    });
  });

  it("Create second user B", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      email_B = data.new_user_email;
    });
  });

  it("Obtain information about user A", function () {
    return user_info_func({
      page,
      email: email_A,
    }).then(data => {
      user_id_A = data.user.id;
    });
  });

  it("Obtain information about user B", function () {
    return user_info_func({
      page,
      email: email_B,
    }).then(data => {
      user_id_B = data.user.id;
    });
  });

  it("Open page with bank holidays", function () {
    return open_page_func({
      page,
      url: application_host + 'settings/bankholidays/',
    })
  });

  it("Create new bank holiday to be on 2 Aug 2016", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#add_new_bank_holiday_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: new_bankholiday_form_id + ' input[name="name__new"]',
        value: 'Some summer holiday',
      }, {
        selector: new_bankholiday_form_id + ' input[name="date__new"]',
        value: '2016-08-02',
      }],
      submit_button_selector: new_bankholiday_form_id + ' button[type="submit"]',
      message: /Changes to bank holidays were saved/,
    }))
  });

  it("Logout from user A (admin)", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user B", function () {
    return login_user_func({
      application_host, page,
      user_email: email_B,
    })
  });

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  });

  it("As user B create a holiday request from 28 July to morning of 4 Aug 2016 (a)", function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#from',
        value: '2016-07-28',
      }, {
        selector: 'input#to',
        value: '2016-08-04',
      }],
      message: /New leave request was added/,
    })
  });

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  });

  it('As user B create a holiday request from 12 Aug to 15 Aug 2016 (b)', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: '2016-08-12',
      }, {
        selector: 'input#to',
        value: '2016-08-15',
      }],
      message: /New leave request was added/,
    })
  });

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  });

  it('As user B create a holiday request from 26 Aug to 2 Sep 2016', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: '2016-08-26',
      }, {
        selector: 'input#to',
        value: '2016-09-02',
      }],
      message: /New leave request was added/,
    })
  });

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  });

  it('As user B create a sick day request from 18 to 18 Aug 2016', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="leave_type"]',
        option_selector: 'option:nth-child(2)',
      }, {
        selector: 'input#from',
        value: '2016-08-18',
      }, {
        selector: 'input#to',
        value: '2016-08-18',
      }],
      message: /New leave request was added/,
    })
  });

  it("Logout from user B", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user A (admin)", function () {
    return login_user_func({
      application_host, page,
      user_email: email_A,
    })
  });

  it("Open requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  });

  it("Approve newly added leave request", async function () {
    let click_selector = `tr[vpp="pending_for__${email_B}"] .btn-success`;
    await Promise.all([
      page.waitForNavigation(),
      page.click(click_selector)
    ])
    await Promise.all([
      page.waitForNavigation(),
      page.click(click_selector)
    ])
    await Promise.all([
      page.waitForNavigation(),
      page.click(click_selector)
    ])
    await Promise.all([
      page.waitForNavigation(),
      page.click(click_selector)
    ])
  });

  it("Logout from user A (admin)", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user B", function () {
    return login_user_func({
      application_host, page,
      user_email: email_B,
    })
  });

  it("Open Book leave popup window", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ])
  });

  it('As user B cretae a holiday request from 24 Aug to 24 Aug 2016 (but not approved)', function () {
    return submit_form_func({
      page,
      form_params: [{
        selector: 'input#from',
        value: '2016-08-24',
      }, {
        selector: 'input#to',
        value: '2016-08-24',
      }],
      message: /New leave request was added/,
    })
  });

  it("Logout from user B", function () {
    return logout_user_func({
      application_host, page,
    })
  });

  it("Login as user A (admin)", function () {
    return login_user_func({
      application_host, page,
      user_email: email_A,
    })
  });

  it('Navigate to team view and ensure that it shows 9 days were deducted for Aug 2016', function () {
    return open_page_func({
      url: application_host + 'calendar/teamview/?date=2016-08',
      page,
    }).then(() => page.$eval(
      `tr[data-vpp-user-list-row="${user_id_B}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )).then(txt => {
      expect(txt, 'Ensure that system shows 9 days as deducted')
        .to.be.eql('9');
    });
  });

  it('1.5 days deducted for July 2016', function () {
    return open_page_func({
      url: application_host + 'calendar/teamview/?date=2016-07',
      page,
    }).then(() => page.$eval(
      `tr[data-vpp-user-list-row="${user_id_B}"] span.teamview-deducted-days`,
      e => e.innerText.trim()
    )).then(txt => {
      expect(txt, 'Ensure that system shows 1.5 days as deducted')
        .to.be.eql('1.5');
    });
  });

  it('2 days deducted for Sept 2016', function () {
    return open_page_func({
      url: application_host + 'calendar/teamview/?date=2016-09',
      page,
    })
      .then(() => page.$eval(
        `tr[data-vpp-user-list-row="${user_id_B}"] span.teamview-deducted-days`,
        e => e.innerText.trim()
      )).then(txt => {
        expect(txt, 'Ensure that system shows 2 days as deducted')
          .to.be.eql('2');
      });
  });

  after(function () {
    return page.close()
  });
});
