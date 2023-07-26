const db = require('../lib/model/db');

module.exports = {
    async up(queryInterface) {
        await queryInterface.addColumn(
            'Company', 'auth_config', db.Company.attributes.auth_config
        )
        await queryInterface.addColumn(
            'Company', 'recover_token', db.Company.attributes.recover_token
        )
        await queryInterface.addColumn(
            'Company', 'auth_domain'
        )
        await queryInterface.changeColumn(
            'User', 'email',
            { type: DataTypes.STRING, unique: true }
        )
        await queryInterface.removeIndex('User', 'lastname')
        await Promise.all(db.Company.findAll().map(c => {
            if (!c.ldap_auth_enabled) return
            c.auth_config = [{
                method: 'ldap',
                config: c.ldap_auth_config,
            }]
            return c.save()
        }))
        await queryInterface.dropColumn(
            'Company', 'ldap_auth_enabled'
        )
        await queryInterface.dropColumn(
            'Company', 'ldap_auth_config'
        )
    },

    async down() {
        throw new Error("Cannot go back to previous DB schema, potential loss of data and inability to restore passwords")
    },
};