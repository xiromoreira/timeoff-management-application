
'use strict';

const
  bluebird      = require('bluebird'),
  handlebars    = require('express-handlebars').create({
    partialsDir : __dirname+'/../views/partials/',
    extname     : '.hbs',
    helpers     : require('./view/helpers')(),
  }),
  config        = require('./config'),
  nodemailer    = require('nodemailer'),
  smtpTransport = require('nodemailer-smtp-transport'),
  {getCommentsForLeave} = require('./model/comment');

function Email(){

}

// This is a little helper that ensure that data in context are in a shape
// suitable for usage in templates
//
function _promise_to_unfold_context(context) {
  if (context.hasOwnProperty('user')){
    return context.user.reload_with_session_details();
  } else {
    return Promise.resolve(1);
  }
}

// Resolves with ready to use email and its subject.
// There is two staged rendering process (due to limitation
// of hadlebar layout mechanism):
//  * render inner part of template
//  * place the innerpart ingo ready to use HTML wrapper
const promise_rendered_email_template = Email.promise_rendered_email_template = async (args) => {
  const filename = args.template_name;
  const context = args.context || {};

  await _promise_to_unfold_context(context);

  const raw_text = await handlebars.render(
    __dirname + '/../views/email/' + filename + '.hbs',
    { user: context.user.name},
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

let send_email;
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

  if (!send_email) {
    const transporter = nodemailer.createTransport(smtpTransport(
      config.get("email_transporter")
    ));

    send_email = (data) => transporter.sendMail(data)
  }
  return send_email;
};

// Send registration complete email for provided user
//
Email.prototype.promise_registration_email = async function (args) {
  const user = args.user;
  const send_mail = get_send_email();

  const email_obj = await promise_rendered_email_template({
    template_name: 'registration_complete',
    context: { user },
  });

  const send_result = await send_mail({
    from: config.get('application_sender_email'),
    to: user.email,
    subject: email_obj.subject,
    html: email_obj.body,
  });
  await user.record_email_addressed_to_me(email_obj);
  return send_result;
};

Email.prototype.promise_add_new_user_email = function(args){
  const company    = args.company,
        admin_user = args.admin_user,
        new_user   = args.new_user,
        send_mail  = get_send_email();

  return promise_rendered_email_template({
    template_name : 'add_new_user',
    context : {
      new_user   : new_user,
      admin_user : admin_user,
      company    : company,
      user       : new_user,
    }
  })
  .then(function(email_obj){

    return send_mail({
      from    : config.get('application_sender_email'),
      to      : new_user.email,
      subject : email_obj.subject,
      html    : email_obj.body,
    })
    .then(function(send_result){
      return new_user.record_email_addressed_to_me(email_obj)
        .then(function(){ return Promise.resolve( send_result ); });
    });
  });

};

Email.prototype.promise_leave_request_revoke_emails = function(args){
  const self = this,
  leave      = args.leave,
  send_mail  = get_send_email();

  let template_name_to_supervisor = 'leave_request_revoke_to_supervisor';
  let template_name_to_requestor  = 'leave_request_revoke_to_requestor';

  if ( leave.get('user').is_auto_approve() ) {
    template_name_to_supervisor = 'leave_request_revoke_to_supervisor_autoapprove';
    template_name_to_requestor  = 'leave_request_revoke_to_requestor_autoapprove';
  }

  const promise_email_to_supervisor = comments => promise_rendered_email_template({
    template_name : template_name_to_supervisor,
    context : {
      leave,
      comments,
      approver  : leave.get('approver'),
      requester : leave.get('user'),
      user      : leave.get('approver'),
    }
  })
  .then(email_obj =>
    send_mail({
      from    : config.get('application_sender_email'),
      to      : leave.get('approver').email,
      subject : email_obj.subject,
      html    : email_obj.body,
    })
    .then(() => leave.get('approver').record_email_addressed_to_me(email_obj))
  );

  const promise_email_to_requestor = comments => promise_rendered_email_template({
    template_name : template_name_to_requestor,
    context : {
      leave,
      comments,
      approver  : leave.get('approver'),
      requester : leave.get('user'),
      user      : leave.get('user'),
    }
  })
  .then(email_obj =>
    send_mail({
      from    : config.get('application_sender_email'),
      to      : leave.get('user').email,
      subject : email_obj.subject,
      html    : email_obj.body,
    })
    .then(() => leave.get('user').record_email_addressed_to_me(email_obj))
  );

  return getCommentsForLeave({leave})
    .then(comments => bluebird.join(
      promise_email_to_supervisor(comments), promise_email_to_requestor(comments),
      () => bluebird.resolve()
    ));
};

Email.prototype.promise_leave_request_emails = function(args){
  var leave      = args.leave,
      send_mail  = get_send_email();

  var template_name_to_supervisor = 'leave_request_to_supervisor';
  var template_name_to_requestor  = 'leave_request_to_requestor';

  if ( leave.get('user').is_auto_approve() ) {
    template_name_to_supervisor = 'leave_request_to_supervisor_autoapprove';
    template_name_to_requestor  = 'leave_request_to_requestor_autoapprove';
  }

  const promise_email_to_supervisor = ({comments, requesterAllowance}) => supervisor => promise_rendered_email_template({
    template_name : template_name_to_supervisor,
    context : {
      leave,
      comments,
      approver  : supervisor,
      requester : leave.get('user'),
      user      : supervisor,
      requesterAllowance,
    }
  })
  .then(email_obj =>
    send_mail({
      from    : config.get('application_sender_email'),
      to      : supervisor.email,
      subject : email_obj.subject,
      html    : email_obj.body,
    })
    .then(() => supervisor.record_email_addressed_to_me(email_obj))
  );

  const promise_email_to_requestor = ({comments, requesterAllowance}) => promise_rendered_email_template({
    template_name : template_name_to_requestor,
    context : {
      leave,
      comments,
      approver  : leave.get('approver'),
      requester : leave.get('user'),
      user      : leave.get('approver'),
      requesterAllowance,
    }
  })
  .then(email_obj => send_mail({
      from    : config.get('application_sender_email'),
      to      : leave.get('user').email,
      subject : email_obj.subject,
      html    : email_obj.body,
    })
    .then(() => leave.get('user').record_email_addressed_to_me(email_obj))
  );

  return Promise.all([
      getCommentsForLeave({leave}),
      leave.get('user').promise_allowance(),
    ])
    .then(([comments, requesterAllowance]) => bluebird.join(
      promise_email_to_requestor({comments, requesterAllowance}),
      leave.get('user')
        .promise_supervisors()
        .map(supervisor => promise_email_to_supervisor({comments, requesterAllowance})(supervisor)),
      () => bluebird.resolve()
    ));
};


Email.prototype.promise_leave_request_decision_emails = function(args){
  const
    self   = this,
    leave  = args.leave,
    action = args.action,
    was_pended_revoke = args.was_pended_revoke,
    send_mail         = get_send_email();

  const promise_email_to_supervisor = comments => promise_rendered_email_template({
    template_name : 'leave_request_decision_to_supervisor',
    context : {
      leave,
      action,
      was_pended_revoke,
      comments,
      approver:  leave.get('approver'),
      requester: leave.get('user'),
      user:      leave.get('approver'),
    }
  })
  .then(email_obj =>
    send_mail({
      from    : config.get('application_sender_email'),
      to      : leave.get('approver').email,
      subject : email_obj.subject,
      html    : email_obj.body,
    })
    .then(()=>leave.get('approver').record_email_addressed_to_me(email_obj))
  );

  const promise_email_to_requestor = comments => promise_rendered_email_template({
    template_name : 'leave_request_decision_to_requestor',
    context : {
      leave,
      action,
      was_pended_revoke,
      comments,
      approver:  leave.get('approver'),
      requester: leave.get('user'),
      user:      leave.get('user'),
    }
  })
  .then(email_obj =>
    send_mail({
      from    : config.get('application_sender_email'),
      to      : leave.get('user').email,
      subject : email_obj.subject,
      html    : email_obj.body,
    })
    .then(() => leave.get('user').record_email_addressed_to_me(email_obj))
  );

  return getCommentsForLeave({leave})
    .then(comments => bluebird.join(
      promise_email_to_supervisor(comments), promise_email_to_requestor(comments),
      () => Promise.resolve()
    ));
};

Email.send_forgot_password_email = async (args) => {
  let user = args.user,
      send_mail = get_send_email();

  const company = await user.getCompany();
  const email_obj = await promise_rendered_email_template({
    template_name: 'forgot_password',
    context: {
      user: user,
      company: company,
    }
  });
  const send_result = await send_mail({
    from: config.get('application_sender_email'),
    to: user.email,
    subject: email_obj.subject,
    html: email_obj.body,
  });
  await user.record_email_addressed_to_me(email_obj);
  return send_result;
};

Email.prototype.promise_reset_password_email = function(args){
  var user      = args.user,
      send_mail = get_send_email();

  return promise_rendered_email_template({
    template_name : 'reset_password',
    context : {
      user : user,
    }
  })
  .then(function(email_obj){

    return send_mail({
      from    : config.get('application_sender_email'),
      to      : user.email,
      subject : email_obj.subject,
      html    : email_obj.body,
    })
    .then(function(send_result){
      return user.record_email_addressed_to_me(email_obj)
        .then(function(){ return Promise.resolve( send_result ); });
    });
  });
};

Email.prototype.promise_leave_request_cancel_emails  = function(args){
  const
    leave     = args.leave,
    send_mail = get_send_email();

  const promise_email_to_supervisor = comments => promise_rendered_email_template({
    template_name : 'leave_request_cancel_to_supervisor',
    context : {
      leave,
      comments,
      approver:  leave.get('approver'),
      requester: leave.get('user'),
      user:      leave.get('approver'),
    }
  })
  .then(emailObj => send_mail({
      from    : config.get('application_sender_email'),
      to      : leave.get('approver').email,
      subject : emailObj.subject,
      html    : emailObj.body,
    })
    .then(() => leave.get('approver').record_email_addressed_to_me(emailObj))
  );

  const promise_email_to_requestor = comments => promise_rendered_email_template({
    template_name : 'leave_request_cancel_to_requestor',
    context : {
      leave,
      comments,
      approver:  leave.get('approver'),
      requester: leave.get('user'),
      user:      leave.get('user'),
    }
  })
  .then(emailObj => send_mail({
      from    : config.get('application_sender_email'),
      to      : leave.get('user').email,
      subject : emailObj.subject,
      html    : emailObj.body,
    })
    .then(() => leave.get('user').record_email_addressed_to_me(emailObj))
  );

  return getCommentsForLeave({leave})
    .then(comments => bluebird.join(
      promise_email_to_supervisor(comments), promise_email_to_requestor(comments),
      () => Promise.resolve()
    ));
};

module.exports = Email;
