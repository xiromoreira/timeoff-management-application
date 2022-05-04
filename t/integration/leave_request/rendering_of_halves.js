
'use strict'

const
  expect = require('chai').expect,
  config = require('../../lib/config'),
  application_host = config.get_application_host(),
  login_user_func = require('../../lib/login_with_user'),
  register_new_user_func = require('../../lib/register_new_user'),
  logout_user_func = require('../../lib/logout_user'),
  open_page_func = require('../../lib/open_page'),
  submit_form_func = require('../../lib/submit_form'),
  add_new_user_func = require('../../lib/add_new_user')


describe('Ensure that leaves with not full days are rendered properly', function () {

  this.timeout(config.get_execution_timeout())

  var non_admin_user_email, new_user_email, page

  it('Create new company', function () {
    return register_new_user_func({
      application_host,
    }).then(data => {
      page = data.page
      new_user_email = data.email
    })
  })

  it("Create new non-admin user", function () {
    return add_new_user_func({
      application_host, page,
    }).then(data => {
      non_admin_user_email = data.new_user_email
    })
  })

  it("Logout from admin acount", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as non-admin user", function () {
    return login_user_func({
      application_host, page,
      user_email: non_admin_user_email,
    })
  })

  it("Open calendar page", function () {
    return open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      page,
    })
  })

  it("Request new partial leave: morning to afternoon", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#from',
        value: '2015-06-16',
      }, {
        selector: 'select[name="to_date_part"]',
        option_selector: 'option[value="3"]',
        value: "3",
      }, {
        selector: 'input#to',
        value: '2015-06-17',
      }],
      message: /New leave request was added/,
    }))
  })

  it("Request new partial leave: afternoon to morning", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="3"]',
        value: "3",
      }, {
        selector: 'input#from',
        value: '2015-06-23',
      }, {
        selector: 'select[name="to_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#to',
        value: '2015-06-24',
      }],
      message: /New leave request was added/,
    }))
  })


  it("Request just morning", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="2"]',
        value: "2",
      }, {
        selector: 'input#from',
        value: '2015-06-09',
      }, {
        selector: 'select[name="to_date_part"]',
        option_selector: 'option[value="1"]',
        value: "1",
      }, {
        selector: 'input#to',
        value: '2015-06-09',
      }],
      message: /New leave request was added/,
    }))
  })

  it("Request just multi days leave starting next afternoon", function () {
    return Promise.all([
      new Promise(res => setTimeout(res, 250)),
      page.waitForSelector('.modal-content'),
      page.click('#book_time_off_btn')
    ]).then(() => submit_form_func({
      page,
      form_params: [{
        selector: 'select[name="from_date_part"]',
        option_selector: 'option[value="3"]',
        value: "3",
      }, {
        selector: 'input#from',
        value: '2015-06-09',
      }, {
        selector: 'select[name="to_date_part"]',
        option_selector: 'option[value="1"]',
        value: "1",
      }, {
        selector: 'input#to',
        value: '2015-06-11',
      }, {
        selector: 'select[name="leave_type"]',
        option_selector: 'option[data-tom-index="1"]',
      }],
      message: /New leave request was added/,
    }))
  })

  it("Go to my requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it("Ensure that both new leave requests are listed and both are marked as partial", async function () {
    await page.waitForSelector('table.user-requests-table td[data-tom-leave-dates="1"]')
    const dates_str = await page.$$eval(
      'table.user-requests-table td[data-tom-leave-dates="1"]',
      list => list.map(e => e.innerText.replace(/\s+/g, ' ')))
    expect(dates_str.length, 'Ensure two elements with leave dates were found').to.be.equal(4)
    expect(dates_str.sort(), 'Ensure that date ranges values are as expected')
      .to.be.deep.equal([
        '2015-06-09 (afternoon) 2015-06-11',
        '2015-06-09 (morning) 2015-06-09',
        '2015-06-16 (morning) 2015-06-17 (afternoon)',
        '2015-06-23 (afternoon) 2015-06-24 (morning)'
      ])
  })

  it('Ensure tooltips include leave type name', function () {
    return open_page_func({
      url: application_host + 'calendar/?show_full_year=1&year=2015',
      page,
    }).then(() =>
      Promise.all([9, 10, 11, 16, 17, 23, 24].map(day => page.$eval(
        `.month_June td.half_1st.day_${day} span`,
        e => e.getAttribute('data-original-title'))
      ))
    ).then(([title9, title10, title11, title16, title17, title23, title24]) => {
      expect(title9).to.be.eq('Holiday (morning) Sick Leave (afternoon): New absence waiting approval')
      expect(title10).to.be.eq('Sick Leave: New absence waiting approval')
      expect(title11).to.be.eq('Sick Leave: New absence waiting approval')
      expect(title16).to.be.eq('Holiday (morning) : New absence waiting approval')
      expect(title17).to.be.eq('Holiday (afternoon): New absence waiting approval')
      expect(title23).to.be.eq('Holiday (afternoon): New absence waiting approval')
      expect(title24).to.be.eq('Holiday (morning) : New absence waiting approval')
    })
  })

  it("Logout from non-admin account", function () {
    return logout_user_func({
      application_host, page,
    })
  })

  it("Login as admin user", function () {
    return login_user_func({
      application_host, page,
      user_email: new_user_email,
    })
  })

  it("Go to my requests page", function () {
    return open_page_func({
      url: application_host + 'requests/',
      page,
    })
  })

  it("Ensure that both new leave requests are listed for approval and both are marked as partial", function () {
    return page.$$eval(
      'table.requests-to-approve-table td[data-tom-leave-dates="1"]',
      l => l.map(e => e.innerText.replace(/\s+/g, ' '))
    ).then(dates_str => {
      expect(dates_str.length, 'Ensure two elements with leave dates were found').to.be.equal(4)
      expect(dates_str.sort(), 'Ensure that date ranges values are as expected')
        .to.be.deep.equal([
          '2015-06-09 (afternoon) 2015-06-11',
          '2015-06-09 (morning) 2015-06-09',
          '2015-06-16 (morning) 2015-06-17 (afternoon)',
          '2015-06-23 (afternoon) 2015-06-24 (morning)'
        ])
    })
  })

  after(function () {
    return page.close()
  })

})
