

// test.js 最小化测试样例
const sinon = require('sinon');
const assert = require('assert');

describe('基础测试', () => {
  it('应该验证存根调用', () => {
    const stub = sinon.stub().returns(42);
    assert.strictEqual(stub(), 42);
  });
});
