


// 开奖结果处理模块 (core/lottery.js)

const fs = require('fs');
const path = require('path');



const config = require("../config");
const fileUtils = require("../utils/file");
const logger = require("../utils/logger");
const telegram = require("./telegram");
const TelegramBetting = require('./telegramBetting');
const dbWriter = require('./dbWriter');  // 引入数据库模块
const util = require('util');
// const exec = util.promisify(require('child_process').exec);
// const { exec } = require('child_process'); // 确保顶部已引入
const targetScript = path.join('E:', '爬虫', '6sanlianpao2.js'); 


const { exec } = require('child_process'); // ✅ 保留原生方法



class LotteryHandler {
  constructor() {
    this.results = [];
    this.resultListeners = []; // 存储监听器的数组
    this.loadResults();
    this.publicGroupHandler = null;
    this.pc28Handler = null;
    this.activeProcesses = new Map();


  }

  // 加载开奖结果
  loadResults() {
    this.results = fileUtils.readJSONFile(config.paths.results) || [];
    logger.info(`已加载 ${this.results.length} 条开奖记录`);
  }

  /**
     * 统计最近N期中指定数字的出现次数
     * @param {number[]} targetNumbers - 要统计的目标数字数组（如[13,14]） 
     * @param {number} [count=20] - 统计的期数
     * @returns {Object} { total: 总数, details: 详细结果 }
     */
    // 类方法（自动挂载到原型）
  getRecentNumberStats(targetNumbers, count = 20) {
  // getRecentNumberStats(targetNumbers, count = 20) {
    if (!this.results || this.results.length === 0) {
      this.loadResults(); // 确保数据已加载
    }

    const recentResults = this.results
      .sort((a, b) => b.period - a.period) // 按期号降序
      .slice(0, count);

    const stats = {
      total: 0,
      details: [],
      targetNumbers: targetNumbers
    };

    recentResults.forEach(result => {
      const num = parseInt(result.result);
      if (targetNumbers.includes(num)) {
        stats.total++;
        stats.details.push({
          period: result.period,
          time: result.time,
          result: result.result,
          number: num
        });
      }
    });

    return stats;
  }





  // // core/lottery.js
  // const processedPeriods = new Set();

  // function onResultReceived(result) {
  //   if (processedPeriods.has(result.period)) return;
  //   processedPeriods.add(result.period);
  //   emitResultEvent(result); // 触发唯一事件
  // }








  // 根据期号查询开奖结果，调用本地开奖记录文件。
  getResultByPeriod(period) {
    if (!this.results || this.results.length === 0) {
      this.loadResults(); // 懒加载
    }
    return this.results.find(r => r.period === period.toString()) || null;
  }



  // 保存开奖结果
  saveResults() {
    const sortedResults = this.results.sort((a, b) => 
      parseInt(a.period) - parseInt(b.period)
    );
    
    fileUtils.writeJSONFile(config.paths.results, sortedResults);
    const last10Results = sortedResults.slice(-2).filter(Boolean); 
    // console.log(last10Results)
    // const insertedCount = dbWriter.batchWriteResults(last10Results);
    dbWriter.batchWriteResults(last10Results);
    // logger.debug(`已同步保存到数据库，影响行数: ${last10Results}`);
    // console.log(sortedResults)
    logger.debug("开奖结果已保存");
  }

  // 添加结果监听器
  addResultListener(callback) {
    this.resultListeners.push(callback);
  }

  // 移除结果监听器
  removeResultListener(callback) {
    this.resultListeners = this.resultListeners.filter(
      listener => listener !== callback
    );
  }

  // 通知所有监听器有新结果
  notifyResultListeners(result) {
    // addResult();
    this.resultListeners.forEach(listener => {
      try {
        listener(result);
      } catch (err) {
        logger.error("结果监听器执行出错:", err);
      }
    });
  }

  // 从消息中提取开奖结果
  parseResult(message, date) {
    const regex1 = /(\d+)期\s+([\d+]+)=(\d+)/;
    const regex2 = /(\d+)期开奖结果\s+([\d+]+)=(\d+)/;
    
    const match = message.match(regex1) || message.match(regex2);
    if (!match) return null;

    return {
      period: match[1],
      details: match[2],
      result: match[3],
      time: date || Math.floor(Date.now() / 1000),
      message: message,
    };
  }

  // 添加开奖结果
  async addResult(result) {
    const exists = this.results.some(r => r.period === result.period);
    if (exists) {
      // logger.debug(`期数 ${result.period} 已存在，跳过添加，也不往群里发通知了。`);
      return false;
    }

    this.results.push(result);
    this.saveResults();
    logger.success(`已添加开奖结果: 第 ${result.period} 期 ${result.details}=${result.result}`);
    // logger.success(`开奖时间: ${result.time}`);
    logger.success(`开奖时间:${new Date(result.time * 1000).toLocaleString()}`);
    // await this.runScripts();
    // await this.launchChildProcess().catch(console.error);
    

    exec(`node "${targetScript}"`, {
      cwd: path.dirname(targetScript) // 关键设置：指定工作目录为脚本所在路径
    }, (error) => {
      if (error) {
        console.error(`[ERROR] 执行失败: ${error.message}`);
        console.error('完整路径:', targetScript); // 打印验证路径
      }
    });




    // // ===============执行外部脚本============
    // // 生成带时间戳的日志
    // const debugLog = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

    // // 被调用脚本路径
    // const targetScript = path.join('E:', '爬虫', '6sanlianpao2.js');

    // debugLog(`🔄 启动子进程 | 主进程PID:${process.pid}`);
    // debugLog(`执行命令: node "${targetScript}"`);

    // const child = exec(`node "${targetScript}"`, {
    //   cwd: path.dirname(targetScript),
    //   env: { ...process.env, NODE_DEBUG: '1' } // 传递调试环境变量
    // }, (error, stdout, stderr) => {
    //   if (error) {
    //     debugLog(`❌ 执行失败: ${error.message}`);
    //     debugLog(`错误代码: ${error.code} | 信号: ${error.signal}`);
    //   }
    // });

    // // 增加进程信息追踪
    // child.on('spawn', () => {
    //   debugLog(`✅ 子进程启动 | PID:${child.pid}`);
    //   debugLog(`工作目录: ${child.spawnargs[2]}`); // 显示实际cwd
    // });

    // // 实时输出日志
    // child.stdout.on('data', (data) => {
    //   debugLog(`[子进程输出] ${data}`);
    // });

    // child.stderr.on('data', (data) => {
    //   debugLog(`[子进程错误] ${data}`);
    // });

    // // 增加执行时间统计
    // const startTime = Date.now();
    // child.on('exit', (code) => {
    //   const duration = ((Date.now() - startTime)/1000).toFixed(2);
    //   debugLog(`⏹️ 进程退出 | 耗时:${duration}s | 退出码:${code}`);
    // });

    // // ===============外部脚本执行完毕=========


    this.notifyResultListeners(result);

    // console.log('<<<<<<<<<<收到开奖结果>>>>>>>>>');
    // console.log(result);
    // console.log('<<<<<<<<<<收到开奖结果>>>>>>>>>');

    // logger.debug('收到结果数据:', {
    //   period: result.period,
    //   details: result.details,
    //   time: result.time,
    //   type: typeof result.period
    // });

    
    // // telegram.sendBetMessage(result);
    // TelegramBetting.sendResult(result);
    // 最佳实践：不阻塞开奖流程
    // require('./telegramBetting').sendResult(result)
    // .catch(err => logger.error('开奖通知发送失败（不影响主流程）:', err));




    // 标准化数据格式
    // const processedResult = {
    // period: result.period,
    // details: result.details,
    // result: result.result || String(eval(result.details.replace(/\+/g, '+'))), // 生产环境建议用安全计算
    // time: result.time
    // };


    // // 新增独立通知（修正版）
    // const message = [
    //   `🎉 第${result.period}期开奖`,
    //   `----------------`,
    //   `🔢 号码: ${result.details}=${result.result}`,
    //   `⏰ 时间: ${new Date(result.time * 1000).toLocaleString()}`,
    //   `----------------`
    // ];

    // console.log('<<<<<<<<<<收到开奖结果>>>>>>>>>');
    // console.log(message);
    // console.log('<<<<<<<<<<收到开奖结果>>>>>>>>>');

    // // // 注意：应该使用 sendBet 而不是 sendMessage
    // require('./telegramBetting').sendBet(config.channels.target, message)
    // .catch(e => logger.error('开奖通知发送失败:', e));


    // 非阻塞发送
    require('./telegramBetting').sendResult(result)
    .catch(err => logger.error('后台通知失败（非关键）:', err));

    
    // // 5. 发送通知（添加await）
    // (async () => {
    //   try {
    //     // const msg = `开奖通知 ${result.period}期\n结果: ${result.details}=${result.result}`;
    //     await require('./telegramBetting').sendResult(result);
    //   } catch (err) {
    //     logger.error('开奖通知发送失败（非阻塞）:', err);
    //   }
    // })();






    console.log();

    // // 非阻塞发送
    // require('./telegramBetting').sendResult(processedResult)
    //   .catch(err => logger.error('后台通知失败（非关键）:', err));











    return true;
  }











  // 获取最新一期结果
  getLatestResult() {
    if (this.results.length === 0) return null;
    return this.results.reduce((latest, current) => 
      parseInt(current.period) > parseInt(latest.period) ? current : latest
    );
  }

  // 获取下一期信息
  getNextPeriodInfo() {
    const latest = this.getLatestResult();
    if (!latest) return null;

    const nextPeriod = parseInt(latest.period) + 1;
    const nextTime = parseInt(latest.time) + 210;
    
    return {
      period: nextPeriod,
      time: nextTime,
      drawTime: new Date(nextTime * 1000),
    };
  }

  // 主动查询开奖结果
  async fetchRecentResults() {
    try {
      logger.info("正在主动查询最新开奖结果...");
      const messages = await telegram.getRecentMessages(config.channels.lottery);
      
      let newResults = 0;
      messages.forEach(msg => {
        const result = this.parseResult(msg.message, msg.date);
        if (result && this.addResult(result)) {
          newResults++;
        }
      });
      
      logger.info(`查询完成，新增 ${newResults} 条开奖记录`);
      return this.results;
    } catch (err) {
      logger.error("查询开奖结果失败:", err);
      return [];
    }
  }

  // 订阅开奖频道

  // 订阅公群21频道（格式1）
  subscribePublicGroup() {
    this.publicGroupHandler = async (event) => {
      if (!["UpdateNewChannelMessage", "UpdateNewMessage"].includes(event.originalUpdate.className)) {
        return;
      }

      const messageObj = event.message;
      const message = messageObj.message;
      
      // 公群21的消息格式示例：
      // "123期开奖结果 1+2+3=6"
      if (message.includes("开奖结果")) {
        const result = this.parsePublicGroupResult(message, messageObj.date);
        if (result) {
          this.addResult(result);
          logger.info(`[公群21] 收到开奖结果: 第 ${result.period} 期`);
        }
      }
    };

    telegram.addEventHandler(
      this.publicGroupHandler,
      new (require("telegram/events").NewMessage)({ chats: [config.channels.public] })
    );
  }

  // 解析公群21的开奖结果（格式1）
  parsePublicGroupResult(message, date) {
    const regex = /(\d+)期开奖结果\s+([\d+]+)=(\d+)/;
    const match = message.match(regex);
    
    if (!match) return null;

    return {
      period: match[1],
      details: match[2],
      result: match[3],
      time: date || Math.floor(Date.now() / 1000),
      message: message,
      source: 'public' // 标记来源
    };
  }

  // 订阅PC28开奖频道（格式2）
  subscribePC28Channel() {
    this.pc28Handler = async (event) => {
      if (!["UpdateNewChannelMessage", "UpdateNewMessage"].includes(event.originalUpdate.className)) {
        return;
      }

      const messageObj = event.message;
      const message = messageObj.message;
      
      // PC28开奖频道的消息格式示例：
      // "📢 123期 1+2+3=6 大双 杂六"
      const result = this.parsePC28Result(message, messageObj.date);
      if (result) {
        this.addResult(result);
        logger.info(`[开奖频道] 收到开奖结果: 第 ${result.period} 期`);
      }
    };

    telegram.addEventHandler(
      this.pc28Handler,
      new (require("telegram/events").NewMessage)({ chats: [config.channels.lottery] })
    );
  }

  // 解析PC28开奖频道的开奖结果（格式2）
  parsePC28Result(message, date) {
    const regex = /(\d+)期\s+([\d+]+)=(\d+)/;
    const match = message.match(regex);
    
    if (!match) return null;

    return {
      period: match[1],
      details: match[2],
      result: match[3],
      time: date || Math.floor(Date.now() / 1000),
      message: message,
      source: 'pc28' // 标记来源
    };
  }

  // 订阅所有频道
  subscribeAllChannels() {
    this.subscribePublicGroup();
    this.subscribePC28Channel();
    logger.info("已订阅公群21和PC28开奖频道");
  }

  // 取消订阅（如果需要）
  unsubscribeAll() {
    if (this.publicGroupHandler) {
      telegram.removeEventHandler(this.publicGroupHandler);
    }
    if (this.pc28Handler) {
      telegram.removeEventHandler(this.pc28Handler);
    }
    logger.info("已取消所有订阅");
  }


  

  async runScripts() {
    // 路径定义（建议使用 path 模块）
    const scripts = [
      'node E:/爬虫/fenduandaochu4to28test.js',  // 脚本1
      'E:\\28sqltest\\jisuanbaocunpeizhi\\1.bat', // 批处理
      'node E:/爬虫/duqubiaogeshuju3.js'         // 脚本2
    ];

    try {
      // 顺序执行脚本
      for (const cmd of scripts) {
        const { stdout, stderr } = await exec(cmd);
        
        // 打印实时日志
        console.log(`[执行成功] ${cmd}\n输出: ${stdout}`);
        if (stderr) console.warn(`[警告] ${cmd}\n错误流: ${stderr}`);
      }
      return { success: true };
    } catch (error) {
      // 结构化错误信息
      console.error(`[致命错误] 执行失败: ${error.cmd}\n`, {
        code: error.code,
        signal: error.signal,
        stderr: error.stderr
      });
      return { 
        success: false,
        failedCmd: error.cmd,
        errorDetail: error 
      };
    }
  }






    // 重构后的方法
    async launchChildProcess() {
      const absolutePath = path.resolve(__dirname, targetScript);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`[PATH_ERROR] 无效路径: ${absolutePath}`);
      }

      
      try {
        const targetScript = path.join('E:', '爬虫', '6sanlianpao2.js');
        
        // 新增路径校验
        if (!fs.existsSync(targetScript)) {
          throw new Error(`[PATH_ERROR] 脚本路径不存在: ${targetScript}`);
        }
  
        // 使用回调方式确保进程对象获取
        const child = exec(`node "${targetScript}"`, {
          cwd: path.dirname(targetScript),
          env: { ...process.env, NODE_DEBUG: '1' },
          timeout: 30000
        }, (error) => { 
          // 回调处理（非必须）
        });
  
        // 立即绑定事件监听
        child.on('spawn', () => {
          this._handleSpawn(child);
        });
  
        child.on('exit', (code, signal) => {
          this._handleExit(child, code, signal);
        });
  
        // 加入进程池
        this.activeProcesses.set(child.pid, {
          process: child,
          startTime: Date.now(),
          status: 'running'
        });
  
        return child;
  
      } catch (error) {
        logger.error(`[PROCESS_LAUNCH_FAIL] ${error.message}`);
        throw error;
      }
    }
  
    // 事件处理器封装
    _handleSpawn(child) {
      logger.success(`✅ 子进程启动 | PID:${child.pid}`);
      child.stdout.on('data', (data) => {
        logger.info(`[CHILD_OUT] ${data.toString().trim()}`);
      });
      
      child.stderr.on('data', (data) => {
        logger.error(`[CHILD_ERR] ${data.toString().trim()}`);
      });
    }
  
    _handleExit(child, code, signal) {
      const duration = ((Date.now() - startTime)/1000).toFixed(2);
      this.activeProcesses.delete(child.pid);
      logger[code === 0 ? 'success' : 'error'](
        `⏹️ 进程退出 | PID:${child.pid} 状态:${code} 信号:${signal} 耗时:${duration}s`
      );
    }

  

  // // 全局异常捕获
  // process.on('unhandledRejection', (reason) => {
  //   debugLog('error', `⚠️ 未处理的Promise异常: ${reason.stack || reason}`);
  // });

  // 执行示例
  // launchChildProcess().catch(console.error);


  
  // // 每 500 秒运行一次
  // setInterval(runScripts, 3 * 1000); // 500 秒
  
  // 立即运行一次
  // runScripts();  


   











}

// module.exports = new LotteryHandler();
// module.exports = new LotteryHandler(); // 确保是这样导出的




// 导出前验证
const instance = new LotteryHandler();
console.log('方法验证:', 
  instance.getRecentNumberStats instanceof Function ? '✅ 方法存在' : '❌ 方法丢失'
);

module.exports = instance; // 确保导出实例
// module.exports = LotteryHandler; // ✅ 导出类