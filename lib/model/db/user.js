"use strict";

const
  { Op } = require('sequelize'),
  crypto = require('crypto'),
  _ = require('underscore'),
  moment = require('moment'),
  Promise = require("bluebird"),

  UserAllowance = require('../user_allowance'),
  { htmlToText } = require('html-to-text'),

  // User mixins
  withCompanyAwareness = require('../mixin/user/company_aware'),
  withAbsenceAwareness = require('../mixin/user/absence_aware');

const { sorter } = require("../../util");

const LeaveCollectionUtil = require('../leave_collection')();

module.exports = function (sequelize, DataTypes) {

  const User = sequelize.define("User", {
    // TODO add validators!
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    activated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'This flag means that user account was activated, e.g. login',
    },
    admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicate if account can edit company wide settings',
    },
    auto_approve: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicate if leave request from current employee are auto approved',
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date employee start to work for company',
      get: function () {
        return moment.utc(this.getDataValue('start_date')).format('YYYY-MM-DD');
      },
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Date emplyee stop working for company',
      get: function () {
        const endDate = this.getDataValue('end_date');
        if (!endDate) {
          return endDate;
        }

        return moment.utc(endDate).format('YYYY-MM-DD');
      },
    },
    recover_token: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: 'Token used to recover password',
    }
  }, {
    indexes: [
      {
        fields: ['companyId'],
      },
      {
        fields: ['lastname'],
      },
    ],
  });

  const instance_methods = get_instance_methods(sequelize);

  withCompanyAwareness.call(instance_methods, sequelize);
  withAbsenceAwareness.call(instance_methods, sequelize);

  const class_methods = get_class_methods(sequelize);

  withAssociations.call(class_methods, sequelize);
  withScopes.call(class_methods, sequelize);

  Object.assign(User.prototype, instance_methods);
  Object.assign(User, class_methods);

  return User;
};


/*
 * Convenience method that returns an object with definition of User's instance methods.
 *
 * */
function get_instance_methods(sequelize) {

  return {

    is_my_password: function (password) {
      return sequelize.models.User.hashify_password(password) === this.password;
    },

    /*
     * Activate user only when it is inactive.
     * Return promise that gets user's object.
     * */
    maybe_activate: function () {
      if (!this.activated) {
        this.activated = true;
      }
      return this.save();
    },

    is_admin: function () {
      return this.admin === true;
    },

    /*
     * Indicates is leave requests from current user are automatically approved
     * */
    is_auto_approve: function () {
      return this.auto_approve === true;
    },

    full_name: function () {
      return this.name + ' ' + this.lastname;
    },

    /*
     * Indicates if the user is active
     * */
    is_active: function () {
      return this.end_date === null || moment(this.end_date).isAfter(moment());
    },

    // TODO VPP: rename this method as its name misleading: it returns all users
    // managed by current users + user itself, so it should be something like
    // "promise_all_supervised_users_plus_me"
    // In fact this method probably have to be ditched in favour of more granular ones
    //
    promise_users_I_can_manage: async function () {
      const self = this;

      let users = [];

      if (self.is_admin()) {
        // Check if current user is admin, then fetch all users form company
        const company = await self.getCompany({
          scope: ['with_all_users'],
        });

        users = company.users;

      } else {
        // If current user has any departments under supervision then get
        // all users from those departments plus user himself,
        // if no supervised users an array with only current user is returned
        const departments = await self.promise_supervised_departments();

        users = departments.map(({ users }) => users).flat();
      }

      // Make sure current user is considered as well
      users.push(self);

      users = _.uniq(users, ({ id }) => id);
      users = users.sort((a, b) => sorter(a.lastname, b.lastname));

      return users;
    },

    /*
     * Return user's boss, the head of department user belongs to
     *
     * */
    promise_boss: function () {
      return this.getDepartment({
        scope: ['with_boss'],
      })
        .then(department => Promise.resolve(department.boss));
    },

    /*
     *  Return users who could supervise current user, that is those who could
     *  approve its leave requests and who can create leave requests on behalf of
     *  those user.
     *
     * */
    promise_supervisors() {
      return this.getDepartment({
        scope: ['with_boss', 'with_supervisors'],
      })
        .then(department => [department.boss, ...department.supervisors]);
    },

    promise_supervised_departments: function () {
      let self = this;

      return sequelize.models.DepartmentSupervisor.findAll({ where: { user_id: self.id } })
        // Obtain departments current user supervises as secondary supervisor
        .then(department_supervisors => department_supervisors.map(obj => obj.department_id))
        .then(department_ids => {

          if (!department_ids) {
            department_ids = [];
          }

          return sequelize.models.Department.scope('with_simple_users').findAll({
            where: {
              [Op.or]: [
                { id: department_ids },
                { bossId: self.id },
              ]
            }
          });
        });
    },

    promise_supervised_users: function () {
      return this
        .promise_supervised_departments()
        .then(departments => {
          return this.constructor.findAll({ where: { DepartmentId: departments.map(d => d.id) } });
        })
    },


    // Generate object that represent Employee allowance
    promise_allowance: function (args) {
      args = args || {};
      // Override user to be current one
      args.user = this;
      return UserAllowance.promise_allowance(args);
    },

    reload_with_leave_details: function (args) {
      const self = this;
      const dbModel = self.sequelize.models;

      return Promise.join(
        self.promise_my_active_leaves(args)
          .then(leaves => LeaveCollectionUtil.enrichLeavesWithComments({ leaves, dbModel })),
        self.getDepartment(),
        self.promise_schedule_I_obey(),
        function (leaves, department, schedule) {
          self.my_leaves = leaves;
          self.department = department;

          // Note: we do not do anything with scheduler as "promise_schedule_I_obey"
          // sets the "cached_schedule" attribute under the hood, which is used in
          // synchronous code afterwards. Yes... itaza`z is silly, but it is where we are
          // at thi moment after mixing non blocking and blocking code together...
          //
          return Promise.resolve(self);
        }
      );

    },

    // This method reload user object to have all necessary information to render
    // each page
    async reload_with_session_details() {
      const [users, company, _schedule] = await Promise.all([
        this.promise_users_I_can_manage(),
        this.get_company_with_all_leave_types(),
        // Note: we do not do anything with scheduler as "promise_schedule_I_obey"
        // sets the "cached_schedule" attribute under the hood, which is used in
        // synchronous code afterwards. Yes... it is silly, but it is where we are
        // at this moment after mixing non blocking and blocking code together...
        this.promise_schedule_I_obey(),
      ]);

      this.supervised_users = users || [];
      this.company = company;
      return this;
    },


    remove: function () {
      var self = this;

      // make sure I am not admin, otherwise throw an error
      if (self.is_admin()) {
        throw new Error('Cannot remove administrator user');
      }

      // make sure I am not supervisor, otherwise throw an error
      return self.promise_supervised_departments()
        .then(departments => {
          if (departments.length > 0) {
            throw new Error("Cannot remove supervisor");
          }

          return self.getMy_leaves();
        })
        .then(function (leaves) {
          // remove all leaves
          return Promise.all(
            _.map(leaves, function (leave) { return leave.destroy(); })
          );
        })

        // remove user record
        .then(function () {
          return self.destroy();
        })

    },

    get_reset_password_token: function () {
      const token = crypto.randomBytes(32).toString('hex');
      this.recover_token = token;
      this.save()
      return Buffer(self.email + ' ' + token).toString('base64');
    },

    // Accept an object that represent email to be sent to current user and
    // record it into the corresponding audit table
    //
    record_email_addressed_to_me: function (email_obj) {

      // validate email object to contain all necessary fields
      if (!email_obj ||
        !email_obj.hasOwnProperty('subject') ||
        !email_obj.subject ||
        !email_obj.hasOwnProperty('body') ||
        !email_obj.body
      ) {
        throw new Error(
          'Got incorrect parameters. There should be an object ' +
          'to represent and email and contain subject and body'
        );
      }

      const promise_action = this.sequelize.models.EmailAudit.create({
        email: this.email,
        subject: htmlToText(email_obj.subject),
        body: htmlToText(email_obj.body),
        user_id: this.id,
        company_id: this.companyId,
      });

      return promise_action;
    },

    promise_schedule_I_obey: function () {
      var self = this;

      if (self.cached_schedule) {
        return Promise.resolve(self.cached_schedule);
      }

      return self.sequelize.models.Schedule
        .findAll({
          where: {
            [Op.or]: [
              { user_id: self.id },
              { company_id: self.companyId },
            ]
          }
        })
        .then(function (schedules) {

          // no schedules for current user in DB, return default one
          if (schedules.length === 0) {
            return self.sequelize.models.Schedule
              .promise_to_build_default_for({ company_id: self.companyId })
              .then(function (sch) { self.cached_schedule = sch; return Promise.resolve(sch) });
          }

          // there are two schedules, presumably one company wide and another
          // is user specific, return later one
          if (schedules.length === 2) {
            return Promise.resolve(
              schedules.find(sch => sch.is_user_specific())
            )
              .then(function (sch) { self.cached_schedule = sch; return Promise.resolve(sch) });
          }

          // single schedule means it is company wide one
          return Promise.resolve(schedules.pop())
            .then(function (sch) { self.cached_schedule = sch; return Promise.resolve(sch) });
        });
    },

  };

};

function get_class_methods(sequelize) {
  return {

    get_user_by_reset_password_token: function (token) {
      var self = this,
        unpacked_token = Buffer(token, 'base64').toString('ascii'),
        email_and_hashed_password = unpacked_token.split(' ');

      return self.find_by_email(email_and_hashed_password[0])
        .then(function (user) {
          if (user && user.recover_token === email_and_token[1]) {
            return Promise.resolve(user);
          } else {
            return Promise.resolve();
          }
        })
    },

    find_by_email(email) {
      // TODO validate email
      const condition = {
        email,
        ...this.get_active_user_filter(),
      };
      return this.findOne({ where: condition });
    },

    find_by_id: function (id) {
      return this.findOne({ where: { id: id } });
    },

    get_active_user_filter: function () {
      return {
        [Op.or]: [
          { end_date: { [Op.eq]: null } },
          { end_date: { [Op.gte]: moment.utc().startOf('day').format('YYYY-MM-DD') } },
        ],
      };
    },

  };
}; // END of class methods


// Mixin-like function that injects definition of User's associations into supplied object.
// (Define relations between User class and other entities in the domain).
//
function withAssociations() {

  this.associate = function (models) {

    models.User.belongsTo(models.Company, {
      as: 'company',
    });
    models.User.belongsTo(models.Department, {
      as: 'department',
      foreignKey: 'DepartmentId',
    });
    models.User.hasMany(models.Leave, {
      as: 'my_leaves',
      foreignKey: 'userId',
    });
    models.User.hasMany(models.UserFeed, {
      as: 'feeds',
      foreignKey: 'userId',
    });
    models.User.hasMany(models.UserAllowanceAdjustment, {
      as: 'adjustments',
      foreignKey: 'user_id',
    });
  };
}


function withScopes() {

  this.loadScope = function (models) {

    models.User.addScope(
      'active',
      function () {
        return { where: models.User.get_active_user_filter() };
      }
    );

    models.User.addScope(
      'withDepartments',
      () => ({
        include: [{
          model: models.Department,
          as: 'department',
        }],
      })
    );

    models.User.addScope(
      'with_simple_leaves',
      () => ({
        include: [{
          model: models.Leave,
          as: 'my_leaves',
          where: {
            [Op.and]: [
              { status: { [Op.ne]: models.Leave.status_rejected() } },
              { status: { [Op.ne]: models.Leave.status_canceled() } },
            ],
          },
        }],
      })
    );

  };
}
