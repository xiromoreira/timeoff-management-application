const argon = require('argon2')
const config = require('../../config')
const DisplayableError = require('../../error/DisplayableError')
const auth_ldap = require('./auth_ldap')

const crypto_secret = Buffer.from(config.get('crypto_secret'), 'ascii')

const hash_password = exports.hash_password = (password) =>
    argon.hash(password, { secret: crypto_secret })

const verify_password = (hash, password) =>
    argon.verify(hash, password, { secret: crypto_secret })

exports.check_login = async ({ Company, User }, form_data) => {
    if (form_data['username'].includes('@'))
        form_data['username'] = form_data['username'].toLowerCase()
    const [_username, domain] = form_data['username'].split('@')
    const user = await User.findOne({
        where: {
            email: form_data['username'],
            ...User.get_active_user_filter()
        }
    })
    if (!user) return null
    const company = await user.getCompany()
    const auth_configs = company?.auth_config || [{ method: 'local' }]
    for (const config of auth_configs) {
        switch (config?.method) {
            case 'ldap':
                if (await auth_ldap(user, form_data['password'], config.config))
                    return user
                else
                    return null
            case 'local':
            default:
                if (await verify_password(user.password, form_data['password']))
                    return user
                else
                    return null
        }
    }
}

exports.register_new_admin_user = async ({ User, Company }, attributes) => {

    // TODO add parameters validation
    // Make sure we hash the password before storing it to DB
    attributes.password = await hash_password(attributes.password)

    let country_code = attributes.country_code,
        timezone = attributes.timezone,
        company_name = attributes.company_name

    delete attributes.company_name
    delete attributes.country_code

    if (attributes.name.toLowerCase().includes('http')) {
        // Why this check? Seems like a security hole patched... a funny history...
        throw new DisplayableError('Name cannot have links')
    }

    let user = await User.find_by_email(attributes.email)
    if (user) {
        throw new DisplayableError('Email is already used')
    }

    const company = await Company.create_default_company({
        country_code, timezone,
        name: company_name,
    })

    attributes.companyId = company.id
    attributes.admin = true

    // Make sure new user is linked with department
    const departments = await company.getDepartments()
    attributes.DepartmentId = departments[0].id

    user = await User.create(attributes)
    // Make sure new departments know who is their boss
    await Promise.all(departments.map(dep => {
        dep.bossId = user.id
        return dep.save()
    }))

    return user
}