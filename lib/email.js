
'use strict';

const
  handlebars = require('express-handlebars').create({
    partialsDir: __dirname + '/../views/partials/',
    extname: '.hbs',
    helpers: require('./view/helpers')(),
  }),
  config = require('./config'),
  nodemailer = require('nodemailer'),
  smtpTransport = require('nodemailer-smtp-transport'),
  { getCommentsForLeave } = require('./model/comment');

const Email = {}

// Resolves with ready to use email and its subject.
// There is two staged rendering process (due to limitation
// of hadlebar layout mechanism):
//  * render inner part of template
//  * place the innerpart ingo ready to use HTML wrapper
const promise_rendered_email_template = Email.promise_rendered_email_template = async (args) => {
  const filename = args.template_name;
  const context = args.context || {};

  const raw_text = await handlebars.render(
    __dirname + '/../views/email/' + filename + '.hbs',
    context,
  );

  // Extract subject from email
  const subject_and_body = raw_text.split(/\r?\n=====\r?\n/);

  const email_body = await handlebars.render(
    __dirname + '/../views/email/wrapper.hbs',
    {
      subject: subject_and_body[0],
      body: subject_and_body[1],
    }
  )

  return {
    subject: subject_and_body[0],
    body: email_body,
  }
};

let _send_email;
// Return function that support same interface as sendMail.
// If current configuration does not allow sending emails, it return empty function
const get_send_email = () => {

  // Check if current installation is set to send emails
  if (!config.get("send_emails") || !config.get("email_transporter")) {
    return function () {
      console.log('Pretend to send email: ' + JSON.stringify(arguments));
      return Promise.resolve();
    };
  }

  if (!_send_email) {
    const transporter = nodemailer.createTransport(smtpTransport(
      config.get("email_transporter")
    ));

    _send_email = (data) => transporter.sendMail(data)
  }
  return _send_email;
};

Email.send_email_user = async (to, template, context) => {
  const email = await promise_rendered_email_template({
    template_name: template,
    context: {
      to: user_to_template(to),
      ...context
    },
  })
  const result = get_send_email()({
    from: config.get('application_sender_email'),
    to: to.email,
    subject: email.subject,
    html: email.body,
  })
  to.record_email_addressed_to_me(email)
  return result
}

const user_to_template = user => ({
  id: user.id,
  name: user.name,
  full_name: user.full_name,
  email: user.email,
})

const company_to_template = company => ({
  id: company.id,
  name: company.name,
})

Email.promise_add_new_user_email = (args) => {
  const company = company_to_template(args.company)
  const admin_user = user_to_template(args.admin_user)
  const new_user = args.new_user

  return Email.send_email_user(new_user, 'add_new_user', {
    admin_user, company,
  })
};

Email.promise_leave_request_revoke_emails = async (args) => {
  const leave = args.leave

  let template_name_to_supervisor = 'leave_request_revoke_to_supervisor';
  let template_name_to_requestor = 'leave_request_revoke_to_requestor';

  if (leave.get('user').is_auto_approve()) {
    template_name_to_supervisor = 'leave_request_revoke_to_supervisor_autoapprove';
    template_name_to_requestor = 'leave_request_revoke_to_requestor_autoapprove';
  }

  const comments = await getCommentsForLeave({ leave })
  const context = {
    leave, comments,
    approver: user_to_template(leave.get('approver')),
    requester: user_to_template(leave.get('user')),
  }
  await Promise.all([
    Email.send_email_user(leave.get('approver'), template_name_to_supervisor, context),
    Email.send_email_user(leave.get('user'), template_name_to_requestor, context),
  ])
};

Email.promise_leave_request_emails = async (args) => {
  const leave = args.leave
  const user = leave.get('user')

  let template_name_to_supervisor = 'leave_request_to_supervisor'
  let template_name_to_requestor = 'leave_request_to_requestor'

  if (user.is_auto_approve()) {
    template_name_to_supervisor = 'leave_request_to_supervisor_autoapprove';
    template_name_to_requestor = 'leave_request_to_requestor_autoapprove';
  }

  const [comments, requesterAllowance] = await Promise.all([
    getCommentsForLeave({ leave }),
    user.promise_allowance(),
  ])

  const context = {
    leave,
    comments,
    approver: user_to_template(leave.get('approver')),
    requester: user_to_template(user),
    requesterAllowance,
  }

  const supervisors = await user.promise_supervisors()
  Promise.all([
    Email.send_email_user(user, template_name_to_requestor, context),
    ...supervisors.map(supervisor =>
      Email.send_email_user(supervisor, template_name_to_supervisor, context))
  ])
};


Email.promise_leave_request_decision_emails = async (args) => {
  const
    leave = args.leave,
    action = args.action,
    was_pended_revoke = args.was_pended_revoke

  const comments = await getCommentsForLeave({ leave })
  const context = {
    leave,
    action,
    was_pended_revoke,
    comments,
    approver: user_to_template(leave.get('approver')),
    requester: user_to_template(leave.get('user')),
  }
  await Promise.all([
    Email.send_email_user(leave.get('approver'), 'leave_request_decision_to_supervisor', context),
    Email.send_email_user(leave.get('user'), 'leave_request_decision_to_requestor', context),
  ])
};

Email.send_forgot_password_email = async (args) => {
  const user = args.user

  const company = await user.getCompany();

  await Email.send_email_user(user, 'forgot_password', {
    user: user_to_template(user),
    company: company_to_template(company),
  })
};

Email.promise_reset_password_email = async (args) =>
  Email.send_email_user(args.user, 'reset_password', {})

Email.promise_leave_request_cancel_emails = async (args) => {
  const leave = args.leave

  const comments = await getCommentsForLeave({ leave })
  const context = {
    leave,
    comments,
    approver: user_to_template(leave.get('approver')),
    requester: user_to_template(leave.get('user')),
  }
  await Promise.all([
    Email.send_email_user(leave.get('approver'), 'leave_request_cancel_to_supervisor', context),
    Email.send_email_user(leave.get('user'), 'leave_request_cancel_to_requestor', context),
  ])
};

module.exports = Email;
