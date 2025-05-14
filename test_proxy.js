// test_proxy.js 更新為
import { createClashAgent } from './utils/proxy.js';

const agent = createClashAgent();
console.log('代理實例類型:', agent.constructor.name);  // 應輸出 HttpsProxyAgent
console.log('Node.js 版本:', process.version);
