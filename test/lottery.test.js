
// test\lottery.test.js
// test/lottery.test.js
const path = require('path');
const LotteryHandler = require('../core/lottery');

describe('子进程管理测试套件', () => {
  let lottery;

  beforeEach(() => {
    jest.useFakeTimers();
    lottery = new LotteryHandler();
    jest.setTimeout(40000);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('正常启动流程', async () => {
    const child = await lottery.launchChildProcess();
    expect(child).toHaveProperty('pid');
    expect(child).toHaveProperty('stdout');
  });
});
