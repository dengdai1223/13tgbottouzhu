const config = require("./config");
const logger = require("./utils/logger");
const betting = require("./core/betting");

class StrategyTester {
  constructor() {
    this.totalPeriods = 55; // 总期数(20初始化+300测试+1结束)
    this.testPeriods = 30;  // 实际测试期数
    this.history = [];       // 存储所有开奖结果
    this.results = {
      1: { bets: 0, profit: 0, maxWin: 0, maxLoss: 0, wins: 0, losses: 0 },
      2: { bets: 0, profit: 0, maxWin: 0, maxLoss: 0, wins: 0, losses: 0 }
    };
  }

  // 生成随机开奖结果(0-27)
  generateRandomResult() {
    const n1 = Math.floor(Math.random() * 10);
    const n2 = Math.floor(Math.random() * 10);
    const n3 = Math.floor(Math.random() * 10);
    return {
      period: (this.history.length + 1).toString(),
      details: `${n1}+${n2}+${n3}`,
      result: n1 + n2 + n3,
      time: Math.floor(Date.now() / 1000)
    };
  }

  // 模拟生成投注数据
  generateMockBet(strategy) {
    // 根据你的实际投注数据结构调整
    // 这里模拟两种策略的不同投注方式
    if (strategy === 1) {
      return {
        numbers: [13, 14], // 同时押注13和14
        amounts: [5, 5],    // 各押5元
        type: "strategy1"
      };
    } else {
      return {
        numbers: [Math.random() > 0.5 ? 13 : 14], // 随机押13或14
        amounts: [10],                           // 押10元
        type: "strategy2"
      };
    }
  }

  // 计算投注盈亏
  calculateProfit(bet, result) {
    try {
      let totalProfit = 0;
      
      // 策略1: 同时押注13和14
      if (bet.type === "strategy1") {
        for (let i = 0; i < bet.numbers.length; i++) {
          if (result.result === bet.numbers[i]) {
            totalProfit += bet.amounts[i] * 9.8 - bet.amounts[i];
          } else {
            totalProfit -= bet.amounts[i];
          }
        }
      } 
      // 策略2: 只押一个号码
      else if (bet.type === "strategy2") {
        if (result.result === bet.numbers[0]) {
          totalProfit += bet.amounts[0] * 9.8 - bet.amounts[0];
        } else {
          totalProfit -= bet.amounts[0];
        }
      }
      
      return totalProfit;
    } catch (err) {
      logger.error("计算盈亏出错:", err);
      return 0;
    }
  }

  // 获取最近N期13/14出现次数
  getRecent1314Count(periods) {
    const recentResults = this.history.slice(-periods);
    return recentResults.filter(r => r.result === 13 || r.result === 14).length;
  }

  // 模拟投注决策
  shouldBet() {
    const count20 = this.getRecent1314Count(20);
    const count10 = this.getRecent1314Count(10);
    
    // 使用你的投注条件逻辑
    return !(count20 > 3 || count10 > 2);
  }

  // 运行测试
  async runTest() {
    try {
      logger.info("开始生成测试数据...");
      
      // 1. 生成321期随机开奖结果
      for (let i = 0; i < this.totalPeriods; i++) {
        this.history.push(this.generateRandomResult());
      }
      
      logger.info(`已生成${this.history.length}期测试数据`);
      logger.info("开始测试两种策略...");
      
      // 2. 测试两种策略
      for (const strategy of [1, 2]) {
        await this.testStrategy(strategy);
      }
      
      // 3. 打印最终结果
      this.printResults();
    } catch (err) {
      logger.error("测试运行出错:", err);
      throw err;
    }
  }
  
  async testStrategy(strategy) {
    logger.info(`\n==== 测试方案${strategy} ====`);
    
    try {
      // 初始化投注模块
      await betting.setBetOption(strategy);
      
      // 从第21期开始测试(前20期用于初始化)
      for (let i = 20; i < this.totalPeriods - 1; i++) {
        const currentPeriod = i + 1; // 转换为1-based编号
        const currentResult = this.history[i];
        
        // 检查是否满足投注条件
        if (this.shouldBet()) {
          const bet = this.generateMockBet(strategy);
          const nextResult = this.history[i + 1]; // 用下一期结果判断盈亏
          const profit = this.calculateProfit(bet, nextResult);
          
          // 更新统计结果
          this.results[strategy].bets++;
          this.results[strategy].profit += profit;
          
          if (profit > 0) {
            this.results[strategy].wins++;
            this.results[strategy].maxWin = Math.max(this.results[strategy].maxWin, profit);
          } else {
            this.results[strategy].losses++;
            this.results[strategy].maxLoss = Math.min(this.results[strategy].maxLoss, profit);
          }
          
          logger.debug(`期数 ${currentPeriod}: 投注 ${JSON.stringify(bet)} | 下期结果 ${nextResult.result} | 盈亏 ${profit.toFixed(2)}`);
        } else {
          logger.debug(`期数 ${currentPeriod}: 跳过投注 (当前结果: ${currentResult.result})`);
        }
      }
    } catch (err) {
      logger.error(`测试方案${strategy}出错:`, err);
      throw err;
    }
  }
  
  printResults() {
    console.log("\n========== 测试结果汇总 ==========");
    console.log(`总测试期数: ${this.testPeriods}期`);
    console.log(`实际投注期数范围: 21-320期`);
    
    for (const strategy of [1, 2]) {
      const r = this.results[strategy];
      console.log(`\n方案 ${strategy}:`);
      console.log(`投注次数: ${r.bets}次`);
      console.log(`盈利次数: ${r.wins}次 (${((r.wins / r.bets) * 100 || 0).toFixed(1)}%)`);
      console.log(`亏损次数: ${r.losses}次`);
      console.log(`总盈亏: ${r.profit.toFixed(2)}元`);
      console.log(`最大盈利: ${r.maxWin.toFixed(2)}元`);
      console.log(`最大亏损: ${r.maxLoss.toFixed(2)}元`);
      console.log(`平均每次盈亏: ${(r.profit / r.bets || 0).toFixed(2)}元`);
    }
  }
}

// 运行测试
new StrategyTester().runTest().catch(err => {
  logger.error("测试失败:", err);
  process.exit(1);
});