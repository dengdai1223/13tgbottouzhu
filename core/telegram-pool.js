


const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const config = require('../config');

class TelegramPool {
  constructor() {
    this.pool = new Map();
    this.defaultSession = config.telegram.sessionFile;
  }

  async getClient(sessionName = 'default') {
    if (!this.pool.has(sessionName)) {
      const sessionFile = sessionName === 'default' 
        ? this.defaultSession 
        : `data/sessions/${sessionName}.session`;
      
      const client = new TelegramClient(
        new StringSession(),
        config.telegram.apiId,
        config.telegram.apiHash,
        { connectionRetries: 5 }
      );
      
      await client.start({
        phoneNumber: async () => await input.text('请输入手机号: '),
        password: async () => await input.text('请输入密码: '),
        phoneCode: async () => await input.text('请输入验证码: '),
        onError: (err) => console.error('连接错误:', err)
      });

      this.pool.set(sessionName, client);
    }
    return this.pool.get(sessionName);
  }
}

module.exports = new TelegramPool();