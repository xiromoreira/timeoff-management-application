'use strict';

const
    expect = require('chai').expect


const check_elements_func = async function (args) {

    const page = args.page,
        elements_to_check = args.elements_to_check || [];

    await Promise.all(elements_to_check.map(async test_case => {
        const el = await page.$(test_case.selector)
        let value
        if (test_case.hasOwnProperty('tick')) {
            value = await (await el.getProperty('checked')).jsonValue()
                .then(checked => checked ? 'on' : 'off')
        } else {
            value = await (await el.getProperty('value')).jsonValue();
        }
        expect(value).to.be.equal(test_case.value);
    }))

    return { page }

}

module.exports = check_elements_func
