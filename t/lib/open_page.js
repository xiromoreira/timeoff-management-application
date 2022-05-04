'use strict';

const get_page = require("./get_page");

module.exports = async (args) => {
  const page = args.page || await get_page(args);
  // Open front page
  await Promise.all([
    page.waitForNavigation(),
    page.goto(args.url)
  ])
  // "export" current page
  return { page }

};

