

// node checkChat.js

// checkChat.js
const telegram = require('./core/telegram');
const config = require('./config');

(async () => {
  try {
    const entity = await telegram.client.getInputEntity(config.channels.target);
    console.log('群组实体验证成功:', {
      id: entity.id,
      class: entity.className,
      accessHash: entity.accessHash
    });
  } catch (err) {
    console.error('群组验证失败:', err.message);
    console.log('请确保：');
    console.log('1. 机器人已加入该群组');
    console.log('2. 群组ID正确（应以 - 开头）');
    console.log('当前配置:', config.channels);
  }
})();