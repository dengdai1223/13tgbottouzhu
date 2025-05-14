// telegramBot.mjs (ESM模块)
export class Bot {
  static ping() { return 'pong' }
}

// test.mjs (测试文件)
import { Bot } from './telegramBot.mjs'
console.log(Bot.ping()) // 成功输出pong
