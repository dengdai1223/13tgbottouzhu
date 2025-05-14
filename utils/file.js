

// 工具函数 (utils/file.js)

const fs = require("fs");
const path = require("path");
const logger = require("./logger");

module.exports = {
  // 读取JSON文件
  readJSONFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
      }
      return null;
    } catch (err) {
      logger.error(`读取文件 ${filePath} 失败:`, err);
      return null;
    }
  },

  // 写入JSON文件
  writeJSONFile(filePath, data) {
    try {
      // 确保目录存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
      return true;
    } catch (err) {
      logger.error(`写入文件 ${filePath} 失败:`, err);
      return false;
    }
  },

  // 加载会话
  loadSession(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return new (require("telegram/sessions").StringSession)(
          fs.readFileSync(filePath, "utf8")
        );
      }
      return new (require("telegram/sessions").StringSession)("");
    } catch (err) {
      logger.error("加载会话失败:", err);
      return new (require("telegram/sessions").StringSession)("");
    }
  },

  // 保存会话
  saveSession(filePath, sessionString) {
    try {
      fs.writeFileSync(filePath, sessionString, "utf8");
      return true;
    } catch (err) {
      logger.error("保存会话失败:", err);
      return false;
    }
  },
  validatePath: (targetPath) => {
    const path = require('path'); // 局部导入
    return path.isAbsolute(targetPath);
  }
};
