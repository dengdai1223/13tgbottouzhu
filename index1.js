

const config = require("./config");
const logger = require("./utils/logger");
const telegram = require("./core/telegram");
const lottery = require("./core/lottery");
const betting = require("./core/betting");
// const input = require('input'); // 新增：引入交互输入模块



// 先执行用户交互，再加载其他模块
// (async () => {
//     try {
//       // 1. 先显示策略选择提示
//       const selectedBetOption = await input.text({
//         text: '请选择投注策略 (1=方案1, 2=方案2, 默认=2):\n> ',  // 添加换行和提示符
//         default: '2',
//         validate: value => ['1', '2', ''].includes(value),
//         timeout: 0 // 禁用超时，无限等待输入
//       });
  
//       const strategy = selectedBetOption || '2';
      
//       if (!['1', '2'].includes(strategy)) {
//         logger.warn('输入无效，将使用默认方案2');
//         strategy = '2';
//       }
  
//       // 2. 动态加载其他模块（关键修改）
//       const telegram = require("./core/telegram");
//       const lottery = require("./core/lottery");
//       const betting = require("./core/betting");
      
//       // 3. 设置策略
//       betting.selectedOption = parseInt(strategy);
//       logger.info(`已选择: 方案${strategy}`);
  
//       // 4. 启动机器人
//       new PC28Bot();
//     } catch (err) {
//       logger.error('启动失败:', err);
//       process.exit(1);
//     }
// })();






class PC28Bot {
  constructor() {

    // 自动设置策略（基于启动参数）
    const isStrategy1 = process.argv.includes('--strategy=1');
    betting.selectedOption = isStrategy1 ? 1 : 2;
    logger.info(`当前运行策略: 方案${betting.selectedOption}`);

    this.betting = betting; // 使用已配置的betting实例
    this.lottery = lottery;
    

    this.timeoutId = null;
    this.betTimer = null;
    this.currentPeriod = null;
    this.resultHandlers = new Map();

    this.isCycleRunning = false; // 新增：循环状态标志
    this.pendingRestart = false; // 新增：待重启标志
    this.init();


  }

  cleanup() {
    clearTimeout(this.timeoutId);
    clearTimeout(this.betTimer);
    this.isCycleRunning = false;
    this.timeoutId = null;
    this.betTimer = null;
  }

  async init() {
    try {
      // 初始化服务
      if (!telegram.isConnected) await telegram.login();
      lottery.subscribeAllChannels();
      
      // 加载历史数据
      await lottery.fetchRecentResults();
      betting.loadRecords();

      // 获取最新一期结果
      const latestResult = lottery.getLatestResult();
      if (latestResult) {
        logger.info(`最新开奖记录: 第 ${latestResult.period} 期 | 结果: ${latestResult.details}=${latestResult.result} | 时间: ${new Date(latestResult.time * 1000).toLocaleString()}`);
      }

      // 启动主循环
      this.startCycle();
    } catch (err) {
      logger.error("初始化失败:", err);
      process.exit(1);
    }
  }

  // 修改后的startCycle
  startCycle(forceRestart = false) {
    // 如果强制重启且已有循环在运行
    if (forceRestart && this.isCycleRunning) {
      this.pendingRestart = true;
      this.cleanup(); // 中断当前循环
      return;
    }

    this.isCycleRunning = true;
    this.pendingRestart = false;
    this.cleanup();

    // 获取下一期信息
    const nextInfo = lottery.getNextPeriodInfo();
    if (!nextInfo) {
      logger.error("获取下一期信息失败");
      return setTimeout(() => this.startCycle(), 15000);
    }

    this.currentPeriod = nextInfo.period;
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = nextInfo.time - now;

    logger.info(`下一期: 第 ${nextInfo.period} 期 | 开奖时间: ${new Date(nextInfo.time * 1000).toLocaleString()} | 剩余: ${timeRemaining}秒`);

    // 情况1：已经超过开奖时间（等待结果）
    if (timeRemaining <= 0) {
      this.waitForResult(nextInfo.period);
      return;
    }

    // 情况2：距离投注时间足够（开奖前30秒投注）
    if (timeRemaining > 30) {
      const betTime = nextInfo.time  -210 +45;
      const delay = (betTime - now) * 1000;

      logger.info(`计划投注时间: ${new Date(betTime * 1000).toLocaleString()}`);
      this.betTimer = setTimeout(() => this.placeBet(nextInfo.period), delay);
    } 
    // 情况3：剩余时间不足30秒（跳过本期）
    else {
      logger.warn(`剩余时间不足30秒，跳过第 ${nextInfo.period} 期投注`);
    }

    // // 设置开奖结果监控（开奖时间后40秒超时）
    // this.timeoutId = setTimeout(() => {

        // ottery.hasResult  中的 hasResult   方法在ottery中未定义，所以这里注释掉。
    //   if (!lottery.hasResult(nextInfo.period)) {
    //     logger.warn(`第 ${nextInfo.period} 期结果超时未返回，主动查询`);
    //     this.handleTimeout(nextInfo.period);
    //   }
    // }, (timeRemaining + 40) * 1000);


    // 设置开奖结果监控（开奖时间后40秒超时）
    this.timeoutId = setTimeout(async () => {
        try {
        logger.warn(`第 ${nextInfo.period} 期结果超时40秒未返回，主动查询`);
        // 第一步：强制更新数据
        await lottery.fetchRecentResults();
        
        // 第二步：检查当前期结果是否存在
        const resultExists = lottery.results.some(
            r => r.period === nextInfo.period.toString()
        );
        
        if (!resultExists) {
            logger.warn(`第 ${nextInfo.period} 期结果超时未返回，主动查询`);
            this.handleTimeout(nextInfo.period);
        }
        } catch (err) {
        logger.error("拉取最新结果失败:", err);
        }
    }, (timeRemaining + 40) * 1000);




    logger.debug(`主循环已启动 [期号:${nextInfo.period}]`);



  }

  placeBet(period) {
    const bet = betting.generateBet();
    if (betting.placeBet(period, bet)) {
      logger.success(`已投注第 ${period} 期: ${JSON.stringify(bet)}`);
      this.waitForResult(period);
    }
  }

  waitForResult(period) {
    logger.info(`开始等待第 ${period} 期开奖结果...`);

    // 修改后的结果处理器
    const resultHandler = (result) => {
    if (this.resultHandlers.has(result.period)) {
      this.cleanup();
      betting.processResult(result.period, result);
      // 强制重启新循环（无论当前状态）
      this.startCycle(true); 

      logger.info(`已处理第 ${result.period} 期结果，启动新循环`);


        logger.success(`收到第 ${period} 期结果: ${result.details}=${result.result}`);
        
        // 盈亏计算
        betting.processResult(period, result);
        
        // 30秒后投注下一期
        this.betTimer = setTimeout(() => {
          this.startCycle();
        }, 30000);
      }
    };

    this.resultHandlers.set(period, resultHandler);
    lottery.addResultListener(resultHandler);
  }

  async handleTimeout(period) {
    this.cleanup();
    
    try {
      // 主动查询最新结果
      await lottery.fetchRecentResults();
      
      // 检查是否有该期结果
      const result = lottery.getResult(period);
      if (result) {
        logger.info(`主动查询到第 ${period} 期结果: ${result.details}=${result.result}`);
        betting.processResult(period, result);
        
        // 30秒后投注下一期
        this.betTimer = setTimeout(() => {
          this.startCycle();
        }, 30000);
      } else {
        logger.warn(`未查询到第 ${period} 期结果，直接进入下一期`);
        this.startCycle();
      }
    } catch (err) {
      logger.error("主动查询失败:", err);
      setTimeout(() => this.startCycle(), 5000);
    }
  }
}

// 启动前检查
const isStrategy1 = process.argv.includes('--strategy=1');
const isStrategy2 = process.argv.includes('--strategy=2');

if (!isStrategy1 && !isStrategy2) {
  logger.warn('未指定策略参数，默认使用方案2');
  logger.info('使用方法: node index1.js --strategy=1 或 --strategy=2');
}

process.on("unhandledRejection", (err) => {
  logger.error("未处理的Promise异常:", err);
});



// 启动机器人
process.on("unhandledRejection", (err) => {
  logger.error("未处理的Promise异常:", err);
});

new PC28Bot();