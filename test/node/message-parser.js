'use strict';

const test = require('tap').test;
const jstp = require('../..');

const testCases = require('../fixtures/message-parser');

testCases.forEach((testCase) => {
  const result = [];
  const parsedLength = jstp.parseNetworkMessages(Buffer.from(testCase.message),
    result);
  test(`must properly parse ${testCase.name}`, (test) => {
    test.strictSame(result, testCase.result);
    test.strictSame(parsedLength, testCase.parsedLength);
    test.end();
  });
});
