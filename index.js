

// 主程序入口 (index.js)


const config = require("./config");
const logger = require("./utils/logger");
const telegram = require("./core/telegram");
const lottery = require("./core/lottery");
const betting = require("./core/betting");

class PC28Bot {
  constructor() {
    this.timeoutId = null;
    this.betTimer = null;
    this.resultHandlers = new Map(); // 用于管理结果监听器
    this.init();
  }

  // 清理资源
  cleanup() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.betTimer) clearTimeout(this.betTimer);
    this.resultHandlers.forEach((handler, period) => {
      lottery.removeResultListener(handler);
    });
    this.resultHandlers.clear();
  }

  async init() {
    try {
      // 初始化 Telegram 连接
      if (!telegram.isConnected) {
        await telegram.login();
      }

      // 调试订阅功能
      console.log(Object.keys(lottery));
      console.log(typeof lottery.subscribeAllChannels);

      // 订阅所有开奖频道
      lottery.subscribeAllChannels();

      // 加载数据
      await lottery.fetchRecentResults();
      betting.loadRecords();

      // 检查未处理的投注
      this.checkUnprocessedBets();

      // 启动主循环
      this.startMainLoop();
    } catch (err) {
      logger.error("初始化失败:", err);
      process.exit(1);
    }
  }

  // 检查未处理的投注
  async checkUnprocessedBets() {
    const unprocessed = betting.checkUnprocessedBets();
    if (unprocessed.length === 0) return;

    const results = lottery.results;
    
    for (const period of unprocessed) {
      const result = results.find(r => r.period === period);
      if (result) {
        logger.info(`处理未结算的投注: 第 ${period} 期`);
        betting.processResult(period, result);
      }
    }
  }

  // 主循环
  // 修改后的主循环
  startMainLoop() {
    // 1. 获取下一期信息
    const nextPeriodInfo = lottery.getNextPeriodInfo();
    // 2. 打印调试信息
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = nextPeriodInfo.time - now + 40;
    const currentPeriod = nextPeriodInfo.period - 1;

    logger.info(`当前期: ${currentPeriod}, 下一期: ${nextPeriodInfo.period}`);
    logger.info(`预计开奖时间: ${new Date(nextPeriodInfo.time * 1000).toLocaleString()}`);

    if (!nextPeriodInfo) {
      logger.error("无法获取下一期信息");
      return;
    }

    // const now = Math.floor(Date.now() / 1000);
    // const timeRemaining = nextPeriodInfo.time - now;
    // const currentPeriod = nextPeriodInfo.period - 1;

    // 检查是否已经收到当前期结果
    const currentResult = lottery.results.find(r => r.period === currentPeriod.toString());
    
    if (currentResult) {
      logger.info(`第 ${currentPeriod} 期结果已收到，准备下一期投注`);
      this.scheduleNextBet(nextPeriodInfo);
      return;
    }

    if (timeRemaining <= 0) {
      logger.info(`第 ${currentPeriod} 期已到开奖时间，等待结果...`);
      this.waitForResultWithTimeout(currentPeriod);
    } else {
      this.startCountdown(nextPeriodInfo.time, nextPeriodInfo.period);
    }
  }

  // 新增方法：安排下一期投注（在开奖时间后40秒）
  scheduleNextBet(nextPeriodInfo) {
    const now = Math.floor(Date.now() / 1000);
    const betTime = nextPeriodInfo.time -210 + 40; // 开奖后40秒
    
    // 计算延迟时间（确保不会在开奖前投注）
    const delay = Math.max(0, (betTime - now) * 1000);

    logger.info(`将在 ${new Date(betTime * 1000).toLocaleString()} 投注第 ${nextPeriodInfo.period} 期`);

    this.betTimer = setTimeout(() => {
      this.placeBet(nextPeriodInfo.period);
      
      // 投注后开始监控开奖结果
      this.startCountdown(nextPeriodInfo.time + 30, nextPeriodInfo.period + 1);
    }, delay);
  }

  // 修改后的倒计时方法
  startCountdown(nextTime, nextPeriod) {
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = nextTime - now;

    logger.info(`距离第 ${nextPeriod} 期开奖还有 ${timeRemaining} 秒`);

    // 每10秒输出一次剩余时间
    const countdownInterval = setInterval(() => {
      const remaining = nextTime - Math.floor(Date.now() / 1000);
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        this.waitForResultWithTimeout(nextPeriod);
      }
    }, 10000);
  }





    // 只有在距离开奖时间大于30秒时才投注
    // if (timeRemaining > 30) {
    //   const betTime = nextTime - 30; // 开奖前30秒投注
    //   const betDelay = (betTime - now) * 1000;
      
    //   this.betTimer = setTimeout(() => {
    //     // 再次确认时间是否仍然足够
    //     const currentRemaining = nextTime - Math.floor(Date.now() / 1000);
    //     if (currentRemaining > 30) {
    //       this.placeBet(nextPeriod);
    //     } else {
    //       logger.warn(`实际投注时间不足30秒（剩余${currentRemaining}秒），取消投注`);
    //     }
    //   }, betDelay);
    // } else {
    //   logger.warn(`距离第 ${nextPeriod} 期开奖不足30秒（剩余${timeRemaining}秒），跳过本期投注`);
    //   // 直接等待结果
    // //   this.waitForResultWithTimeout(nextPeriod);
    // }
  

  // 投注方法
  placeBet(period) {
    // 生成随机投注
    const bet = betting.generateBet();
    
    // 记录投注
    if (betting.placeBet(period, bet)) {
      // 设置超时检测
      this.timeoutId = setTimeout(() => {
        logger.warn(`第 ${period} 期开奖结果未在 ${config.settings.betTimeout/1000} 秒内未返回，主动查询`);
        this.handleTimeout(period);
      }, config.settings.betTimeout);
    }
  }

  waitForResultWithTimeout(period) {
    // this.cleanup(); // 先清理之前的资源
    
    logger.info(`等待第 ${period} 期开奖结果...`);
    
    let resultReceived = false;
    const resultHandler = (result) => {
      if (result.period === period.toString()) {
        resultReceived = true;
        this.cleanup();
        betting.processResult(period, result);
        
        // 1. 获取下一期信息
        const nextPeriodInfo = lottery.getNextPeriodInfo();
        const nextPeriod = nextPeriodInfo.period;
        const nextDrawTime = nextPeriodInfo.time; // 下一期开奖时间
        
        // 2. 在本期开奖后30秒投注下一期
        logger.info(`本期开奖完成，30秒后将投注第 ${nextPeriod} 期`);
        
        this.betTimer = setTimeout(() => {
          this.placeBet(nextPeriod);
          
          // 3. 设置下期开奖的超时监控（开奖时间后40秒）
          const now = Math.floor(Date.now() / 1000);
          const checkTimeout = (nextDrawTime + 40 - now) * 1000;
          
          this.timeoutId = setTimeout(() => {
            if (!lottery.hasResult(nextPeriod)) {
              logger.warn(`第 ${nextPeriod} 期开奖结果未在预期时间内返回，主动查询`);
              this.handleTimeout(nextPeriod);
            }
          }, checkTimeout);
          
          logger.info(`已设置第 ${nextPeriod} 期开奖监控，将在开奖时间后40秒检查结果`);
          
        }, 30000); // 本期开奖后30秒投注
      }
    };
  
    // 保存监听器引用
    this.resultHandlers.set(period, resultHandler);
    lottery.addResultListener(resultHandler);
  
    // 设置本期结果等待超时（比下期开奖时间更短的超时）
    this.timeoutId = setTimeout(() => {
      if (!resultReceived) {
        logger.warn(`第 ${period} 期结果等待超时，主动查询`);
        this.cleanup();
        this.handleTimeout(period);
      }
    }, 60000); // 本期结果等待超时60秒
  }


  // 处理超时主动查询
  async handleTimeout(period) {
    logger.warn(`开始主动查询第 ${period} 期结果...`);
    
    try {
      // 1. 主动查询最新结果
      await lottery.fetchRecentResults();
      
      // 2. 检查是否有该期结果
      const result = lottery.results.find(r => r.period === period.toString());
      
      if (result) {
        logger.info(`成功查询到第 ${period} 期结果`);
        betting.processResult(period, result);
        
        // 3. 准备下一期
        const nextPeriod = parseInt(period) + 1;
        setTimeout(() => {
          this.placeBet(nextPeriod);
          this.startCountdown(result.time + 210, nextPeriod);
        }, 30000);
      } else {
        logger.warn(`未找到第 ${period} 期结果，可能尚未开奖`);
        // 可以在这里添加重试逻辑或直接跳到下一期
      }
    } catch (err) {
      logger.error(`查询第 ${period} 期结果失败:`, err);
    }
  }
}

// 启动机器人
new PC28Bot();







