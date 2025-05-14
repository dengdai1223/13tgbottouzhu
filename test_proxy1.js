// test_proxy.mjs
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyTest = async () => {
  try {
    const agent = new HttpsProxyAgent('http://127.0.0.1:7890');
    const response = await fetch('https://api64.ipify.org?format=json', { 
      agent,
      headers: { 'User-Agent': 'Node/' + process.version }
    });
    
    const data = await response.json();
    console.log('✅ 代理測試成功');
    console.log('出口IP:', data.ip);
    console.log('響應時間:', response.headers.get('date'));
  } catch (error) {
    console.error('❌ 代理故障:', error.message);
    console.log('故障排查建議:');
    console.log('1. 確認代理服務器正在運行');
    console.log('2. 檢查防火牆端口設置');
    console.log('3. 嘗試更換為socks代理協議');
  }
};

proxyTest();
