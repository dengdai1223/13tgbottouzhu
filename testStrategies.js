


const { PC28Bot } = require('./index3');

async function testStrategy(strategyNumber, testCycles = 100) {
  console.log(`\n===== 开始测试方案 ${strategyNumber} =====`);
  
  // 模拟命令行参数
  process.argv.push(`--strategy=${strategyNumber}`, '--test');
  
  const bot = new PC28Bot();
  bot.isTestMode = true;
  
  // 模拟运行多个周期
  for (let i = 0; i < testCycles; i++) {
    await bot.startMainCycle();
    // 添加延迟避免过快
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 获取并打印测试结果
  const results = betting.getTestResults();
  console.log(`方案 ${strategyNumber} 测试结果:`);
  console.log(`总投注次数: ${results.totalBets}`);
  console.log(`盈利次数: ${results.winCount}`);
  console.log(`亏损次数: ${results.lossCount}`);
  console.log(`总盈亏: ${results.totalProfit}`);
}

// 运行测试
(async () => {
  await testStrategy(1);  // 测试方案1
  await testStrategy(2);  // 测试方案2
})();