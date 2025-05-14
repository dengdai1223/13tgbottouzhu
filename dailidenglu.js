

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { createClashAgent } from './utils/proxy.js';

const apiId = process.env.TG_API_ID; // 从 https://my.telegram.org 获取
const apiHash = process.env.TG_API_HASH;
const session = new StringSession(''); // 留空生成新会话

const client = new TelegramClient(
  session,
  apiId,
  apiHash,
  {
    connectionRetries: 3,
    proxyHandler: async () => createClashAgent()
  }
);

(async () => {
  await client.start({
    phoneNumber: () => prompt('输入手机号 (国际格式):'),
    password: () => prompt('输入两步验证密码 (若有):'),
    phoneCode: () => prompt('输入短信验证码:'),
    onError: (err) => console.error(err),
  });
  console.log('登录成功! Session:', client.session.save());
})();