const telegramBetting = require('./core/telegramBetting');
// await telegramBetting.telegram.ensureConnection(); // telegram 属性不存在
const config = require('./config');

(async () => {
  console.log('=== 开始测试 ===');
  
  // 测试连接
  console.log('验证连接状态...');
  const isConnected = await telegramBetting.telegram.ensureConnection();
  console.log('连接状态:', isConnected ? '✅ 已连接' : '❌ 未连接');

  // 测试发送
  if (isConnected) {
    console.log('\n测试消息发送...');
    const testMsg = `测试消息 ${new Date().toLocaleString()}`;
    // const success = await telegramBetting.sendBet(config.channels.target, testMsg);

    const success = await telegramBetting.sendBet(123456, testMsg);
    console.log('发送结果:', success ? '✅ 成功' : '❌ 失败');
  }
})();