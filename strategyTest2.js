const config = require("./config");
const logger = require("./utils/logger");
const betting = require("./core/betting");

class StrategyTester {
  constructor() {
    this.totalPeriods = 100; // 总期数(20初始化+30测试+5缓冲)
    this.testPeriods = 30;  // 实际测试期数
    this.history = [];      // 存储所有开奖结果
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
    const result = n1 + n2 + n3;
    return {
      period: (this.history.length + 1).toString(),
      details: `${n1}+${n2}+${n3}`,
      result: result,
      time: Math.floor(Date.now() / 1000),
      // 添加结果类型分类
      type: this.classifyResult(result)
    };
  }

  // 分类结果类型
  classifyResult(result) {
    if (result === 13 || result === 14) return '13/14';
    if (result > 13) return '大';
    return '小';
  }

  // 模拟生成投注数据
  generateMockBet(strategy) {
    // 这里模拟你的实际投注模式
    if (strategy === 1) {
      return {
        types: ['大单', '大双', '小单'],
        amounts: [47, 43, 43],
        strategy: '方案1'
      };
    } else {
      return {
        types: ['大', '小'],
        amounts: [50, 50],
        strategy: '方案2'
      };
    }
  }

  // 计算投注盈亏
  calculateProfit(bet, result) {
    let totalProfit = 0;
    let winAmount = 0;
    
    // 根据不同的投注类型计算盈亏
    for (let i = 0; i < bet.types.length; i++) {
      const betType = bet.types[i];
      const amount = bet.amounts[i];
      
      if (this.isBetWin(betType, result)) {
        const odds = this.getOdds(betType);
        winAmount += amount * odds;
        totalProfit += amount * (odds - 1);
      } else {
        totalProfit -= amount;
      }
    }
    
    return {
      profit: totalProfit,
      winAmount: winAmount
    };
  }

  // 判断投注是否获胜
  isBetWin(betType, result) {
    const resultType = result.type;
    const num = result.result;
    
    switch(betType) {
      case '大单': return num > 13 && num % 2 === 1;
      case '大双': return num > 13 && num % 2 === 0;
      case '小单': return num <= 13 && num % 2 === 1;
      case '小双': return num <= 13 && num % 2 === 0;
      case '大': return num > 13;
      case '小': return num <= 13;
      case '13': return num === 13;
      case '14': return num === 14;
      default: return false;
    }
  }

  // 获取赔率
  getOdds(betType) {
    const oddsMap = {
      '大单': 4.33,
      '大双': 4.73,
      '小单': 4.73,
      '小双': 4.33,
      '大': 1.98,
      '小': 1.98,
      '13': 9.8,
      '14': 9.8
    };
    return oddsMap[betType] || 1;
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
    const canBet = !(count20 > 3 || count10 > 2);
    
    return {
      canBet,
      count20,
      count10
    };
  }

  // 运行测试
  async runTest() {
    try {
      console.log("========== 开始测试 ==========");
      
      // 1. 生成测试数据
      for (let i = 0; i < this.totalPeriods; i++) {
        this.history.push(this.generateRandomResult());
      }
      
      // 2. 显示前20期初始化数据
      console.log("\n=== 前20期开奖结果 ===");
      for (let i = 0; i < 20; i++) {
        const result = this.history[i];
        console.log(`第${result.period}期: ${result.details}=${result.result} [${result.type}]`);
      }
      
      // 3. 测试两种策略
      for (const strategy of [1, 2]) {
        await this.testStrategy(strategy);
      }
      
      // 4. 打印最终结果
      this.printResults();
    } catch (err) {
      console.error("测试失败:", err);
      process.exit(1);
    }
  }
  
  async testStrategy(strategy) {
    console.log(`\n\n==== 开始测试方案${strategy} ====`);
    
    try {
      // 初始化投注模块
      await betting.setBetOption(strategy);
      
      // 从第21期开始测试
      for (let i = 20; i < 20 + this.testPeriods; i++) {
        const currentPeriod = i + 1; // 转换为1-based编号
        const currentResult = this.history[i];
        
        // 显示期号分隔线
        console.log("\n" + "=".repeat(40));
        console.log(`第${currentResult.period}期: ${currentResult.details}=${currentResult.result} [${currentResult.type}]`);
        
        // 检查投注条件
        const { canBet, count20, count10 } = this.shouldBet();
        console.log(`过去20期中13/14次数: ${count20}`);
        console.log(`过去10期中13/14次数: ${count10}`);
        
        if (canBet) {
          console.log("可以继续投注");
          
          // 生成投注
          const bet = this.generateMockBet(strategy);
          console.log(`第${currentPeriod}期投注: ${bet.types.join(" ")} ${bet.amounts.join(" ")}`);
          
          // 用下一期结果判断盈亏
          const nextResult = this.history[i + 1];
          const { profit, winAmount } = this.calculateProfit(bet, nextResult);
          
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
          
          // 显示结果
          console.log(`第${currentPeriod}期开奖结果: ${nextResult.details}=${nextResult.result} [${nextResult.type}]`);
          console.log(`第${currentPeriod}期盈亏: ${profit >= 0 ? '+' : ''}${profit.toFixed(2)}元`);
          if (winAmount > 0) {
            console.log(`中奖金额: +${winAmount.toFixed(2)}元`);
          }
        } else {
          console.log("跳过投注 (13/14出现次数过多)");
        }
      }
    } catch (err) {
      console.error(`测试方案${strategy}出错:`, err);
      throw err;
    }
  }
  
  printResults() {
    console.log("\n\n========== 测试结果汇总 ==========");
    console.log(`总测试期数: ${this.testPeriods}期`);
    console.log(`实际投注期数范围: 21-${20 + this.testPeriods}期`);
    
    for (const strategy of [1, 2]) {
      const r = this.results[strategy];
      console.log(`\n方案 ${strategy}:`);
      console.log(`投注次数: ${r.bets}次`);
      console.log(`盈利次数: ${r.wins}次 (${((r.wins / r.bets) * 100 || 0).toFixed(1)}%)`);
      console.log(`亏损次数: ${r.losses}次`);
      console.log(`总盈亏: ${r.profit >= 0 ? '+' : ''}${r.profit.toFixed(2)}元`);
      console.log(`最大盈利: +${r.maxWin.toFixed(2)}元`);
      console.log(`最大亏损: ${r.maxLoss.toFixed(2)}元`);
      console.log(`平均每次盈亏: ${(r.profit / r.bets || 0).toFixed(2)}元`);
    }
  }
}

// 运行测试
new StrategyTester().runTest();