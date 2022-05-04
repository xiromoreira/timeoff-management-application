const puppeteer = require('puppeteer');

module.exports = async function (opts = {}) {
    if (opts.page) return opts.page;
    const browser = await puppeteer.launch({ headless: true });
    return (await browser.pages())[0]
}