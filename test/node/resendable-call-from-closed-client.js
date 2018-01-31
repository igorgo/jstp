'use strict';

const test = require('tap');

const jstp = require('../..');

const appName = 'application';
const interfaces = {
  iface: {
    method: (connection, callback) => {
      test.pass('must send call only once');
      callback(null);
    },
  },
};

const application = new jstp.Application(appName, interfaces);
const serverConfig = { applications: [application] };

const client = { session: null };

test.plan(4);

const server = jstp.net.createServer(serverConfig);
server.listen(0, () => {
  const port = server.address().port;
  jstp.net.connect(appName, null, port, 'localhost', (error, connection) => {
    test.assertNot(error, 'must connect to server');

    connection.close();
    connection.callMethodWithResend('iface', 'method', [], (error) => {
      test.assertNot(error, 'must not return an error');
      connection.close();
      server.close();
    });

    const port = server.address().port;
    client.session = connection.session;

    jstp.net.connect(appName, client, port, 'localhost', (error, conn) => {
      test.assertNot(error, 'must reconnect to server');
      connection = conn;
    });
  });
});