const config = require("./config");
const logger = require("./utils/logger");
const telegram = require("./core/telegram");
const lottery = require("./core/lottery");
// const lottery = require('./core/lottery');
const betting = require("./core/betting");
const TelegramBetting = require('./core/telegramBetting');



// 清除模块缓存（开发环境用）
delete require.cache[require.resolve('./core/lottery')];
// const lottery = require('./core/lottery');

// 验证方法
// console.log('方法调用测试:', typeof lottery.getRecentNumberStats);

// // console.log('Lottery模块方法列表:', Object.keys(lottery));
// // console.log('getRecentNumberStats存在吗?', typeof lottery.getRecentNumberStats === 'function');

// // 测试原型链方法
// console.log(
// '通过原型调用:',
// Object.getPrototypeOf(lottery).getRecentNumberStats([13, 14])
// );

// // 测试实例方法
// console.log(
// '直接调用:',
// lottery.getRecentNumberStats([13, 14])
// );






class PC28Bot {
  constructor() {
    // 策略设置
    const isStrategy1 = process.argv.includes('--strategy=1');
    betting.setBetOption(isStrategy1 ? 1 : 2)
      .then(() => {
        logger.info(`当前运行策略: 方案${betting.selectedOption}`);
        this.init();
      })
      .catch(err => {
        logger.error("策略设置失败:", err);
        process.exit(1);
      });

    // 核心状态
    this.currentPeriod = null;
    this.nextPeriodInfo = null;
    this.cycleTimer = null;
    this.betTimer = null;
    this.resultHandlers = new Map();
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async init() {
    try {
      // 1. 基础服务初始化
      if (!telegram.isConnected) await telegram.login();
      lottery.subscribeAllChannels();

      // 2. 加载数据
      await lottery.fetchRecentResults();
      betting.loadRecords();

      // 3. 获取最新开奖信息
      const latestResult = lottery.getLatestResult();
      if (latestResult) {
        logger.info(`最新开奖: 第${latestResult.period}期 ${latestResult.details}=${latestResult.result}`);
      }

      // 4. 检查未处理投注
      const unprocessed = betting.checkUnprocessedBets();
      if (unprocessed.length > 0) {
        logger.warn(`发现${unprocessed.length}个未处理投注，尝试获取结果...`);
        for (const period of unprocessed) {
        //   const result = await lottery.fetchPeriodResult(period);
          const result = lottery.getResultByPeriod(period);
        //   console.log("未处理的投注开奖情况如下：");
        //   console.log();

        //   console.log(result);


        //   console.log();
        //   console.log("《《《《《未处理的投注开奖情况查询完毕》》》》");

        //   betting.processResult(period, result)
          if (result) {
            betting.processResult(period, result);
          }
        }
      }

      // 5. 启动主循环
      this.startMainCycle(true); // 首次主动查询
    } catch (err) {
      logger.error("初始化失败:", err);
      this.scheduleRetry(10000);
    }
  }


  async safeInit() {
    try {
      await this.init();
      this.retryCount = 0;
    } catch (err) {
      this.retryCount++;
      if (this.retryCount <= this.maxRetries) {
        logger.warn(`初始化失败，第${this.retryCount}次重试...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.safeInit();
      }
      throw err;
    }
  }



  // 核心循环控制器
  async startMainCycle(isInitial = false) {
    this.clearTimers();

    try {
      // 1. 获取下一期信息
      this.nextPeriodInfo = isInitial 
        ? await this.fetchNextPeriod() 
        : lottery.getNextPeriodInfo();

      if (!this.nextPeriodInfo) {
        logger.error("获取期号信息失败，10秒后重试");
        return this.scheduleRetry(10000);
      }

      this.currentPeriod = this.nextPeriodInfo.period;
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = this.nextPeriodInfo.time - now;

      logger.info(`下一期: 第${this.nextPeriodInfo.period}期 | 开奖时间: ${new Date(this.nextPeriodInfo.time * 1000).toLocaleString()} | 剩余: ${timeRemaining}秒`);

      // 2. 设置周期控制
      if (timeRemaining <= 0) {
        this.handleResultWaiting();
      } else {
        this.scheduleBet(timeRemaining);
        this.scheduleResultCheck(timeRemaining);
      }
    } catch (err) {
      logger.error("主循环错误:", err);
      this.scheduleRetry(5000);
    }
  }

  // 获取下一期信息（主动查询）
  async fetchNextPeriod() {
    try {
      await lottery.fetchRecentResults();
      return lottery.getNextPeriodInfo();
    } catch (err) {
      logger.error("主动查询失败:", err);
      return null;
    }
  }

  // 安排投注
  scheduleBet(timeRemaining) {
    if (timeRemaining <= 30) {
        logger.warn("剩余时间不足30秒，跳过投注");
        return;
    }

    const betTime = this.nextPeriodInfo.time - 210 + 45; // 开奖前30秒投注
    const delay = Math.max(0, (betTime - Math.floor(Date.now() / 1000)) * 1000);

    logger.info(`计划投注时间: ${new Date(betTime * 1000).toLocaleString()}`);

    // 获取最近20期和10期的13/14出现次数
    const stats20 = lottery.getRecentNumberStats([13, 14], 20);
    const stats10 = lottery.getRecentNumberStats([13, 14], 10);
    
    logger.info(`最近20期出现13/14的次数: ${stats20.total}`);
    logger.info(`最近10期出现13/14的次数: ${stats10.total}`);

    
    this.betTimer = setTimeout(() => {

        // 检查投注条件
        if (stats20.total > 3 || stats10.total > 2) {
            logger.warn('最近13/14出现次数太多，等待机会再投注...');
            return; // 跳过本次投注
        }

        // 条件满足，执行投注
        this.placeBet(this.nextPeriodInfo.period);
    }, delay);

    
}






  // 安排结果检查
  scheduleResultCheck(timeRemaining) {
    const checkTime = (timeRemaining + 30) * 1000; // 开奖后30秒检查
    this.cycleTimer = setTimeout(async () => {
        const chaxunqihao = this.currentPeriod;
      logger.warn(`第${this.currentPeriod}期结果超时未返回，主动查询`);
    //   logger.warn(`第${chaxunqihao}期结果超时未返回，主动查询`);

    //   const result = await lottery.fetchPeriodResult(this.currentPeriod);
      const result = lottery.getResultByPeriod(this.currentPeriod);
    //   const result = lottery.getResultByPeriod(chaxunqihao);

      if (result) {
        this.handleNewResult(result);
      } else {
        this.scheduleRetry(5000);
      }
    }, checkTime);
  }

  // 处理投注
  async placeBet(period) {
    try {
      const bet = betting.generateBet();
      if (betting.placeBet(period, bet)) {
        logger.success(`已投注第${period}期: ${JSON.stringify(bet)}`);
        
       
        // // 新增：独立发送Telegram通知（不影响原有投注记录）
        // TelegramBetting.sendBet(period, bet).catch(e => {
        //     logger.error('投注通知发送失败（不影响主流程）:', e);
        // });
        
        // 修正：使用telegramBetting发送，不再直接调用telegram
        await require('./core/telegramBetting').sendBet(period, bet);


        this.handleResultWaiting();
      }
    } catch (err) {
      logger.error("投注失败:", err);
      this.scheduleRetry(5000);
    }
  }

//   // 等待开奖结果
//   handleNewResult(result) {
//     this.clearTimers();

//     // 1. 移除结果监听器
//     const handler = this.resultHandlers.get(result.period);
//     if (handler) {
//         lottery.removeResultListener(handler);
//         this.resultHandlers.delete(result.period);
//     }

//     // 2. 处理结果
//     logger.success(`收到第${result.period}期结果: ${result.details}=${result.result}`);
//     const profitResult = betting.processResult(result.period, result);

//     // 3. 启动新周期
//     process.nextTick(() => this.startMainCycle());
// }




  

  // 处理新结果
  handleNewResult(result) {
    this.clearTimers();

    // 1. 移除结果监听器
    const handler = this.resultHandlers.get(result.period);
    if (handler) {
      lottery.removeResultListener(handler);
      this.resultHandlers.delete(result.period);
    }

    // 2. 处理结果
    logger.success(`收到第${result.period}期结果: ${result.details}=${result.result}`);
    const profitResult = betting.processResult(result.period, result);



    console.log();
    console.log();
    // 3. 启动新周期
    process.nextTick(() => this.startMainCycle());
    console.log('已经收到结果重启启动循环');

    //4、统计1314的次数
    // 获取统计结果
    const stats = lottery.getRecentNumberStats([13, 14]);
    logger.info(`最近20期出现13/14的次数: ${stats.total}`);



  }

  // 清理计时器
  clearTimers() {
    clearTimeout(this.cycleTimer);
    clearTimeout(this.betTimer);
    this.cycleTimer = null;
    this.betTimer = null;
  }

  // 安排重试
  scheduleRetry(delay) {
    this.clearTimers();
    this.cycleTimer = setTimeout(() => this.startMainCycle(true), delay);
  }
}


// 启动检查
if (!process.argv.includes('--strategy=1') && !process.argv.includes('--strategy=2')) {
    logger.warn('未指定策略参数，默认使用方案2');
  }
  
  process.on("unhandledRejection", (err) => {
    logger.error("未处理的Promise异常:", err);
  });
  
  // 统一初始化流程
  betting.init()
    .then(() => new PC28Bot().safeInit())
    .catch(err => {
      logger.error("启动失败:", err);
      process.exit(1);
    });