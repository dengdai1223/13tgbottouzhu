// test_proxy.mjs
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

(async () => {
  try {
    const agent = new HttpsProxyAgent('http://127.0.0.1:7890');
    const response = await fetch('https://api64.ipify.org', { agent });
    console.log('當前出口IP:', await response.text());
  } catch (err) {
    console.error('代理測試失敗:', err);
  }
})();
