const db = require('../lib/model/db');

module.exports = {
    async up(queryInterface) {
        await queryInterface.addColumn(
            'Company', 'auth_config', db.Company.attributes.auth_config
        )
        await queryInterface.addColumn(
            'Company', 'recover_token', db.Company.attributes.recover_token
        )
        await Promise.all(db.Company.findAll().map(c => {
            if (!c.ldap_auth_enabled) return
            c.auth_config = [{
                method: 'ldap',
                config: c.ldap_auth_config,
            }]
            return c.save()
        }))
    },

    async down() {
        // Do nothing
    },
};