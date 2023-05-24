"use strict";

const { readdirSync } = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + '/../../../config/db.json')[env];
const sequelize = new Sequelize(config.database, config.username, config.password, config);

const JSONColumnDefinition = (name, options = {}) => config.dialect === 'postgres' ? {
  ...options,
  type: Sequelize.DataTypes.JSONB
} : {
  ...options,
  type: Sequelize.DataTypes.STRING,
  set(val) {
    if (val != null) val = JSON.stringify(val)
    this.setDataValue(name, val);
  },

  get() {
    const val = this.getDataValue(name);
    try {
      return JSON.parse(val);
    } catch (err) {
      console.error(
        'Failed to parse stored JSON for ' + name, val, err
      );
      return null;
    }
  },
}

const db = module.exports = {
  JSONColumnDefinition
};

readdirSync(__dirname)
  .filter(function (file) {
    return (file.indexOf(".") !== 0)
      && (file !== "index.js");
  })
  .forEach(function (file) {
    var model = sequelize["import"](path.join(__dirname, file));
    db[model.name] = model;
  });

// Link models according associations
//
Object.keys(db).forEach(function (modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

// Add scopes
//
Object.keys(db).forEach(function (modelName) {
  if ('loadScope' in db[modelName]) {
    db[modelName].loadScope(db);
  }
});

// Link models based on associations that are based on scopes
//
Object.keys(db).forEach(function (modelName) {
  if ('scopeAssociate' in db[modelName]) {
    db[modelName].scopeAssociate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;