const Imap = require('node-imap')

module.exports = function auth(username, password, config) {
  return new Promise(async (res) => {
    const client = new Imap({
      user: username,
      password,
      ...config,
      port: 143,
      tls: false,
      autotls: 'required'
    })
    client.once('ready', () => {
      client.end()
      res(true)
    })
    client.once('error', (e) => {
      console.error('Could not auth user using imap', username, config, e)
      client.end()
      res(false)
    })
    client.connect()
  })
}
