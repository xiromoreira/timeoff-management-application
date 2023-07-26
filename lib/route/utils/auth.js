const argon = require('argon2')
const config = require('../../config')
const DisplayableError = require('../../error/DisplayableError')
const { Company, User } = require('../../model/db')

const crypto_secret = Buffer.from(config.get('crypto_secret'), 'ascii')

const hash_password = exports.hash_password = (password) =>
    argon.hash(password, { secret: crypto_secret })

const verify_password = (hash, password) =>
    argon.verify(hash, password, { secret: crypto_secret })

exports.check_login = async (form_data) => {
    if (form_data['username'].includes('@'))
        form_data['username'] = form_data['username'].toLowerCase()
    const [_username, domain] = form_data['username'].split('@')
    let user = await User.findOne({
        where: {
            email: form_data['username'],
            ...User.get_active_user_filter()
        }
    })
    const company = await (user ?
        user.getCompany() :
        Company.findOne({ where: { auth_domain: domain } }))

    const auth_configs = company?.auth_config || [{ method: 'local' }]
    for (const config of auth_configs) {
        if (config?.method === 'local') {
            if (user && await verify_password(user.password, form_data['password']))
                return user
        } else {
            try {
                const authModule = require('./auth_' + config?.method)
                if (await authModule(form_data['username'], form_data['password'], config.config)) {
                    if (!user) return createUser({
                        username: form_data['username'],
                    }, company)
                    return user
                }
            } catch (e) {
                console.error('Could not use auth method', config?.method, e)
            }
        }
    }
    return null
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

const createUser = async (data, company) => {
    const email = data['username']
    const username = email.split('@')[0]
    const departments = await company.getDepartments() // TODO default department

    return User.create({
        email,
        name: username,
        lastname: data['lastname'] || '',
        companyId: company.id,
        DepartmentId: departments[0].id,
    })
}
