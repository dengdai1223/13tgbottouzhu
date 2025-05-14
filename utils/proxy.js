// utils/proxy.js
import _HttpsProxyAgent from 'https-proxy-agent';
const HttpsProxyAgent = _HttpsProxyAgent.default || _HttpsProxyAgent;

export const createClashAgent = (config = {}) => {
  return new HttpsProxyAgent({
    protocol: 'http',
    host: '127.0.0.1',
    port: 7890,
    ...config
  });
};
