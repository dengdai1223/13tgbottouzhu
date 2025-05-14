

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const path = require("path");
const config = require("../config");
const logger = require("../utils/logger");
const fileUtils = require("../utils/file");


class TelegramBot {
  constructor() {
    this.client = null;
    this.session = null;
    this.isConnected = false;
    this.connectRetries = 0;
    this.maxRetries = 5;

    this.heartbeatInterval = null;
    this.startHeartbeat();


    this.init();
  }




  // 初始化客户端
  init() {
    // 创建或加载会话
    this.session = fileUtils.loadSession(
      path.join(__dirname, "../../", config.telegram.sessionFile)
    );

    // 创建 Telegram 客户端
    this.client = new TelegramClient(
      this.session,
      config.telegram.apiId,
      config.telegram.apiHash,
      { connectionRetries: 5 }
    );


    this.client.addEventHandler((update) => {
      if (update.className === 'UpdateConnectionState') {
        if (update.state === 1) { // 连接建立
          logger.info('Telegram 连接已建立');
          this.isConnected = true;
        } else { // 连接断开
          logger.warn('Telegram 连接丢失，将在5秒后重连...');
          this.isConnected = false;
          setTimeout(() => this.connect(), 5000);
        }
      }
    });



  }



  // 新增方法：交互式选择策略
  async selectBettingStrategy() {
  try {
    const answer = await input.text({
      text: '\n请选择投注策略:\n1. 方案1(组合下注)\n2. 方案2(数字押注)\n请输入选择(默认2): ',
      default: '2',
      validate: value => ['1', '2', ''].includes(value)
    });
    this.selectedStrategy = parseInt(answer || '2');
    logger.info(`已选择投注方案: ${this.selectedStrategy}`);
  } catch (err) {
    logger.warn('策略选择错误，使用默认方案2', err);
    this.selectedStrategy = 2;
  }
 }





  // 登录
  async login() {
    try {
      logger.info("正在连接 Telegram...");
      
      await this.client.start({
        phoneNumber: async () => await input.text("请输入手机号："),
        password: async () => await input.text("请输入两步验证密码（如果有）："),
        phoneCode: async () => await input.text("请输入验证码："),
        onError: (err) => logger.error(err),
      });

      // 保存会话
      const sessionString = this.client.session.save();
      fileUtils.saveSession(
        path.join(__dirname, "../../", config.telegram.sessionFile),
        sessionString
      );
      

      // 新增：登录成功后立即选择策略
      // await this.selectBettingStrategy();


      logger.success("已成功登录 Telegram！");
      this.isConnected = true;
      return true;
    } catch (err) {
      logger.error("登录失败:", err);
      this.isConnected = false;
      return false;
    }
  }


  // 获取最近消息
  async getRecentMessages(channelId, limit = config.settings.fetchLimit) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const messages = await this.client.getMessages(channelId, { limit });
      return messages.sort((a, b) => a.date - b.date); // 按时间排序
    } catch (err) {
      logger.error("获取最近消息失败:", err);
      return [];
    }
  }


  startHeartbeat() {
    // 清除旧的心跳间隔
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (!this.client.connected) {
          logger.warn('检测到连接断开，尝试重连...');
          await this.connect();
        }
        
        // 发送心跳ping
        await this.client.invoke(new (require('telegram').requests.PingDelayDisconnect)({
          pingId: BigInt(Date.now()),
          disconnectDelay: 60
        }));
        
        logger.debug('心跳检测成功');
      } catch (err) {
        logger.error('心跳检测失败:', err.message);
      }
    }, config.settings.heartbeatInterval || 30000); // 默认30秒
  }

  
  async connect() {
    try {
      if (this.client.connected) return true;
      
      await this.client.connect();
      logger.info('Telegram 连接成功');
      this.isConnected = true;
      return true;
    } catch (err) {
      logger.error('连接失败:', err);
      this.isConnected = false;
      return false;
    }
  }

  



  
    // // 保持连接
    // async connect() {
    //   try {
    //     await this.client.connect();
    //     this.isConnected = true;
    //   } catch (err) {
    //     logger.error("连接失败:", err);
    //     this.isConnected = false;
    //   }
    // }

    // 添加消息处理器
    addEventHandler(callback, event) {
      this.client.addEventHandler(callback, event);
    }

    // 心跳保持连接
    startHeartbeat() {
      setInterval(async () => {
        try {
          await this.connect();
          logger.debug("心跳连接成功");
        } catch (err) {
          logger.error("心跳连接失败:", err);
        }
      }, config.settings.heartbeatInterval);
    }



    /**
     * 发送投注信息到目标群
     * @param {string} message - 要发送的消息内容
     * @param {number} chatId - 目标群ID（可选，默认使用config中的target）
     */
    async sendBetMessage(message, chatId = config.channels.target) {
      if (!await this.ensureConnection()) return false;
      
      try {
        await this.client.sendMessage(chatId, {
          message,
          // parseMode: 'html'
        });
        logger.success(`已发送消息到 ${chatId}`);
        return true;
      } catch (err) {
        logger.error('发送失败:', err);
        return false;
      }
    }

    async ensureConnection(retries = 3) {
      for (let i = 0; i < retries; i++) {
        if (this.isConnected) return true;
        
        try {
          await this.connect();
          if (this.isConnected) return true;
        } catch (err) {
          logger.warn(`[尝试 ${i+1}/${retries}] 连接失败:`, err.message);
        }
        
        if (i < retries - 1) await new Promise(r => setTimeout(r, 2000));
      }
      return false;
    }
}








module.exports = new TelegramBot();