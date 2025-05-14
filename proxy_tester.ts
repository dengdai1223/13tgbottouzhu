// proxy_tester.ts
interface ProxyConfig {
    protocol: 'http' | 'https' | 'socks';
    host: string;
    port: number;
  }
  
  const testProxy = async (config: ProxyConfig): Promise<void> => {
    const { HttpsProxyAgent } = await import('https-proxy-agent');
    const agent = new HttpsProxyAgent(`${config.protocol}://${config.host}:${config.port}`);
    
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('https://api.ip.sb/ip', { agent });
    
    console.log(`使用 ${config.protocol.toUpperCase()} 代理成功 ➜`, await res.text());
  };
  
  // 執行測試
  testProxy({
    protocol: 'http',
    host: '127.0.0.1',
    port: 7890
  });
  