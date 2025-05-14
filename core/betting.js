

// 投注管理模块 (core/betting.js)


const input = require('input'); // 新增：引入交互输入模块
const config = require('../config'); // 在betting.js顶部添加
// // const config = require("../config");
// const config = require('../config'); // 确保正确引入配置文件
const fileUtils = require("../utils/file");
const logger = require("../utils/logger");
const lottery = require("./lottery");

const { colors } = require('../utils/logger');

class BettingManager {
  constructor() {
    this.records = { option1: {}, option2: {} }; // 投注记录
    // 修改：移除硬编码的默认值，改为通过init方法设置
    // this.selectedOption = 2; // 默认使用方案2
    // this.selectedOption = 1; // 默认使用方案2
    this.balance = config.limits.initialBalance; // 初始余额
    this.loadRecords();
  }

    // 新增：异步初始化方法
    async init() {
        await this.promptBetOption();
    }

     // 新增：交互式选择投注方案
  async promptBetOption() {
    try {
      const selected = await input.text({
        text: '请选择投注策略 (1=方案1, 2=方案2, 默认=2):',
        default: '2',
        validate: value => ['1', '2', ''].includes(value)
      });
      
      this.selectedOption = parseInt(selected || '2');
      logger.info(`已选择投注方案: ${this.selectedOption}`);
      
      // 验证选择
      if (![1, 2].includes(this.selectedOption)) {
        logger.warn('无效选择，将使用默认方案2');
        this.selectedOption = 1;
      }
    } catch (err) {
      logger.error('策略选择错误:', err);
      logger.warn('将使用默认方案2');
      this.selectedOption = 2;
    }
  }




  // 加载投注记录
  loadRecords() {
    const data = fileUtils.readJSONFile(config.paths.bets);
    if (data) {
      this.records = data;
      logger.info(`已加载投注记录: 方案1 ${Object.keys(this.records.option1).length} 条, 方案2 ${Object.keys(this.records.option2).length} 条`);
    }
  }

  // 保存投注记录
  saveRecords() {
    fileUtils.writeJSONFile(config.paths.bets, this.records);
    logger.debug("投注记录已保存");
  }

  // 设置投注方案
  // 修改：增强setBetOption方法
  async setBetOption(option) {
    if (option === 1 || option === 2) {
      this.selectedOption = option;
      logger.info(`已切换投注方案 ${option}`);
      return true;
    }
    
    logger.warn("无效的投注方案，保持当前方案");
    return false;
  }


  // 随机生成投注
  generateBet() {

    if (!this.selectedOption) { // 新增：验证是否已选择策略
        logger.error('未选择投注方案，将使用默认方案2');
        this.selectedOption = 2;
    }



    if (this.selectedOption === 1) {
      // 方案1: 随机选择3个组合
      const shuffled = [...config.betting.option1].sort(() => 0.5 - Math.random());
      return {
        type: "option1",
        bets: shuffled.slice(0, 3),
        amount: shuffled.slice(0, 3).reduce((sum, bet) => sum + parseInt(bet.match(/\d+/)[0], 10), 0)
      };
    } else {
      // 方案2: 随机选择1个组合
      const randomIndex = Math.floor(Math.random() * config.betting.option2.length);
      const option = config.betting.option2[randomIndex];
      return {
        type: "option2",
        name: option.name,
        bets: option.bets,
        amount: option.amount
      };
    }
  }

  // 记录投注
  
  placeBet(period, bet) {
    const optionKey = `option${this.selectedOption}`;
    
    // 检查是否已投注
    if (this.records[optionKey][period]) {
      logger.warn(`第 ${period} 期已经投注过，跳过投注`);
      return false;
    }

    // 记录投注
    this.records[optionKey][period] = {
      ...bet,
      time: Math.floor(Date.now() / 1000), // 当前时间戳
      processed: false // 标记是否已处理
    };

    this.saveRecords();
    
    // 记录日志
    if (this.selectedOption === 1) {
      logger.info(`第 ${period} 期投注: ${bet.bets.join(", ")}`);
    } else {
      logger.info(`第 ${period} 期投注: ${bet.name} ${bet.amount}`);
      logger.info(`下注列表: ${bet.bets.join(", ")}`);
    }
    
    return true;
  }

  // 处理开奖结果并计算盈亏
  processResult(period, result) {
    const optionKey = `option${this.selectedOption}`;
    const betRecord = this.records[optionKey][period];
    
    if (!betRecord) {
      logger.warn(`第 ${period} 期没有投注记录`);
      return null;
    }

    if (betRecord.processed) {
      logger.warn(`第 ${period} 期投注已处理过`);
      return null;
    }

    // 计算盈亏
    const profitResult = this.calculateProfit(betRecord, result);
    
    // 更新记录
    this.records[optionKey][period] = {
      ...betRecord,
      result: result.result,
      profit: profitResult.netProfit,
      processed: true,
      processTime: Math.floor(Date.now() / 1000)
    };

    // 更新余额
    this.balance += profitResult.netProfit;

    // logger.info(`[结算开始] 期号 ${period} | 当前余额 ${betting.balance.toFixed(2)}`);
    // // const profitResult = betting.processResult(period, result);
    // logger.info(`[结算完成] 净盈亏 ${profitResult.netProfit >= 0 ? '+' : ''}${profitResult.netProfit.toFixed(2)} | 新余额 ${betting.balance.toFixed(2)}`);
        



    
    this.saveRecords();
    
    // 记录日志
    // if (profitResult.winningBets.length > 0) {
    //   logger.success(`第 ${period} 期中奖组合: ${profitResult.winningBets.join(", ")}`);
    //   logger.success(`中奖金额: ${profitResult.netProfit} 元`);
    // } else {
    //   logger.warn(`第 ${period} 期未中奖，亏损 ${profitResult.totalBet} 元`);
    // }
    
    // // logger.info(`当前余额: ${this.balance} 元`);
    // logger.info(`当前余额: ${this.balance.toFixed(2)} 元`);
    

    // // 记录日志 - 带颜色标识
    // if (profitResult.winningBets.length > 0) {
    //     logger.success(`第 ${period} 期中奖组合: ${profitResult.winningBets.join(", ")}`);
    //     logger.success(`中奖金额: ${colors.green}+${profitResult.netProfit.toFixed(2)}${colors.reset} 元`); // 绿色带+号
    // } else {
    //     logger.error(`第 ${period} 期未中奖，亏损 ${colors.red}-${profitResult.totalBet.toFixed(2)}${colors.reset} 元`); // 红色带-号
    // }

    // // 当前余额动态颜色
    const initialBalance = 1000; // 初始金额
    // const currentBalance = this.balance.toFixed(2);
    // const balanceColor = this.balance >= initialBalance ? colors.green : colors.red;
    // logger.info(`当前余额: ${balanceColor}${currentBalance}${colors.reset} 元`);


    // 使用优化后的方法
    if (profitResult.winningBets.length > 0) {
        logger.success(`第 ${period} 期中奖组合: ${profitResult.winningBets.join(", ")}`);
        logger.success(`中奖金额: ${logger.coloredAmount(profitResult.netProfit, true)} 元`);
    } else {
        logger.error(`第 ${period} 期未中奖，亏损 ${logger.coloredAmount(profitResult.totalBet, false)} 元`);
    }

    logger.info(`当前余额: ${logger.coloredBalance(this.balance, initialBalance)} 元`);











    // 检查止盈止损
    this.checkLimits();
    
    return profitResult;
  }

  // 计算盈亏
  calculateProfit(betRecord, result) {
    const resultNumber = parseInt(result.result, 10);
    let profit = 0;
    let winningBets = [];
    let totalBet = betRecord.amount;

    if (betRecord.type === "option1") {
      // 方案1逻辑
      const isSmall = resultNumber <= 13;
      const isEven = resultNumber % 2 === 0;

      betRecord.bets.forEach((bet) => {
        const betAmount = parseInt(bet.match(/\d+/)[0], 10);
        if (bet.includes("大单") && !isSmall && !isEven) {
          profit += betAmount * (resultNumber === 14 ? 1 : 4.32);
          winningBets.push(bet);
        } else if (bet.includes("大双") && !isSmall && isEven) {
          profit += betAmount * (resultNumber === 14 ? 1 : 4.73);
          winningBets.push(bet);
        } else if (bet.includes("小单") && isSmall && !isEven) {
          profit += betAmount * (resultNumber === 13 ? 1 : 4.73);
          winningBets.push(bet);
        } else if (bet.includes("小双") && isSmall && isEven) {
          profit += betAmount * 4.32;
          winningBets.push(bet);
        }
      });
    } else {
      // 方案2逻辑
      betRecord.bets.forEach((bet) => {
        if (!bet) return;
        const [betAmount, targetNumber] = bet.split("押");
        if (parseInt(targetNumber, 10) === resultNumber) {
          const odds = config.odds[resultNumber] || 0;
          profit += parseInt(betAmount, 10) * odds;
          winningBets.push(bet);
        }
      });
    }

    const netProfit = profit - totalBet;
    return { winningBets, totalBet, netProfit };
  }

  // 检查止盈止损
  checkLimits() {
    if (this.balance <= config.limits.stopLoss) {
      logger.error(`余额 ${this.balance.toFixed(2)} 元，已达到止损点 ${config.limits.stopLoss} 元，停止投注`);
      process.exit(0);
    } else if (this.balance >= config.limits.stopProfit) {
      logger.success(`余额 ${this.balance.toFixed(2)} 元，已达到止盈点 ${config.limits.stopProfit} 元，停止投注`);
      process.exit(0);
    }
  }

  // 检查未处理的投注
  checkUnprocessedBets() {
    const optionKey = `option${this.selectedOption}`;
    const unprocessed = [];
    
    for (const period in this.records[optionKey]) {
      if (!this.records[optionKey][period].processed) {
        unprocessed.push(period);
      }
    }
    
    if (unprocessed.length > 0) {
      logger.info(`发现 ${unprocessed.length} 条未处理的投注记录`);
      return unprocessed;
    }
    
    return [];
  }

  /**
   * 格式化投注信息为可发送文本
   * @param {object} bet - 投注对象
   * @returns {string} 格式化后的投注信息
   */
  formatBetForSending(bet) {
    let betText = '';
    
    if (bet.type === 'option1') {
      betText = bet.bets.join(' ').replace(/"/g, '');
    } else if (bet.type === 'option2') {
      betText = `【${bet.name}】\n${bet.bets.join(' ').replace(/"/g, '')}`;
    }
    
    return `${betText}\n金额: ${bet.amount}`;
  }












}


// module.exports = new BettingManager();


// 修改导出方式，确保单例模式
const bettingManager = new BettingManager();

// 新增：异步初始化单例
(async () => {
    await bettingManager.init();
  })();
  
  


module.exports = bettingManager;