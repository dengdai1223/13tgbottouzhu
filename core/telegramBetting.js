// core/telegramBetting.js
const telegram = require('./telegram');
const logger = require('../utils/logger');
const config = require('../config');

class TelegramBetting {

    constructor() {
    this.queue = [];
    setInterval(() => this.processQueue(), 1000);
    }

    

    async processQueue() {
    if (this.queue.length === 0) return;
    const item = this.queue.shift();
    // ...原有发送逻辑...
    }





  /**
   * 发送投注信息到目标群
   * @param {string} period - 期号
   * @param {object} bet - 投注内容 {type, name, bets, amount}
   */
  async sendBet(period, bet) {
    try {
      // 格式化投注内容
      let betContent;
      if (bet.type === 'option1') {
        betContent = `组合投注: ${bet.bets.join(' ').replace(/"/g, '')}`;
      } else {
        betContent = [
          `【${bet.name}】`,
          `下注项: ${bet.bets.join(' ').replace(/"/g, '')}`
        ].join('\n');
      }

      const message = [
        `📌 第${period}期投注`,
        '----------------',
        betContent,
        '----------------',
        `💰 金额: ${bet.amount}`
      ].join('\n');

      await telegram.sendBetMessage(message);
      logger.success(`[投注消息] 已发送到群组 ${config.channels.target}`);
      return true;
    } catch (err) {
      logger.error('[投注消息] 发送失败:', err.message);
      return false;
    }
  }









  /**
   * 发送开奖结果到目标群
   * @param {object} result - 开奖结果 {period, details, result, time}
   * @param {string} [remark] - 附加备注信息
   */

  async sendResult(result) {  // 直接使用result参数，不需要重命名

    // console.log('调试 - result对象内容:', JSON.stringify(result, null, 2));
    try {
        // 构建开奖消息
        const message = [
            `🎉 第${result.period}期开奖`,
            '----------------',
            `🔢 号码: ${result.details}=${result.result}`,
            `⏰ 时间: ${new Date(result.time * 1000).toLocaleString()}`,
            '----------------'
        ].join('\n');  // 将数组转换为字符串，用换行符连接




        await telegram.sendBetMessage(message);
        logger.success(`[开奖消息] 已发送到群组 ${config.channels.target}`);

  
    //   await telegram.sendBetMessage(config.channels.target, message);
      console.log('[SUCCESS] 开奖通知发送成功:', `第${result.period}期`);

      logger.success(`开奖通知发送成功: 第${result.period}期`);
      return true;

    } catch (err) {
      logger.error('开奖通知发送失败:', {
        error: err.message,
        result: resultData ? JSON.stringify(result) : 'null/undefined'
      });
      return false;
    }
  }


  
  
  // 安全计算函数
  _calculateResult(details) {
    try {
      return String(details.split('+').reduce((sum, num) => sum + parseInt(num), 0));
    } catch {
      return '未知';
    }
  }










  /**
   * 发送普通文本消息到目标群
   * @param {string} text - 要发送的文本内容
   */
  async sendText(text) {
    try {
      await telegram.sendBetMessage(text);
      logger.success(`[文本消息] 已发送到群组 ${config.channels.target}`);
      return true;
    } catch (err) {
      logger.error('[文本消息] 发送失败:', err.message);
      return false;
    }
  }
}

module.exports = new TelegramBetting();