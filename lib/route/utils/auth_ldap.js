
module.exports = function auth(username, password, ldapConfig) {
  return new Promise(async (res) => {
    try {
      const ldap_server = await get_ldap_server(ldapConfig);
      // email = 'euler@ldap.forumsys.com'; password = 'password'; // TODO remove
      ldap_server.authenticate(username, password, async (err, u) => {
        if (err) {
          console.log("LDAP auth error: %s", err);
          res(false)
        }
        res(true)
      });

      ldap_server.close();
    }
    catch (error) {
      console.error('Failed while trying to deal with LDAP server with error: %s', error);
      res(false)
    }
  })
}

const get_ldap_server = (config) => {
  let tlsOptions = config.allow_unauthorized_cert ? { rejectUnauthorized: false } : {};

  // When testing consider using TEST LDAP server
  // http://www.forumsys.com/en/tutorials/integration-how-to/ldap/online-ldap-test-server/
  let ldap = new LdapAuth({
    url: config.url,
    bindDn: config.binddn,
    bindCredentials: config.bindcredentials,
    searchBase: config.searchbase,
    searchFilter: '(mail={{username}})',
    cache: false,
    tlsOptions: tlsOptions
  });

  return ldap;
}