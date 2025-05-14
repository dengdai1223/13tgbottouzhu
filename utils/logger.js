

// 日志工具 (utils/logger.js)


const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    
    // 前景色
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    
    // 背景色
    bgBlack: "\x1b[40m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
    bgWhite: "\x1b[47m"
  };
  
  const log = (level, color, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`${color}[${timestamp}] [${level}]${colors.reset}`, ...args);
  };
  
  module.exports = {
    debug: (...args) => log("DEBUG", colors.dim, ...args),
    info: (...args) => log("INFO", colors.reset, ...args),
    warn: (...args) => log("WARN", colors.yellow, ...args),
    error: (...args) => log("ERROR", colors.red, ...args),
    success: (...args) => log("SUCCESS", colors.green, ...args),



    

    coloredAmount: (amount, isPositive) => {
        const color = isPositive ? colors.green : colors.red;
        const sign = isPositive ? '+' : '-';
        return `${color}${sign}${Math.abs(amount).toFixed(2)}${colors.reset}`;
    },
    
    coloredBalance: (balance, initialBalance) => {
        const color = balance >= initialBalance ? colors.green : colors.red;
        return `${color}${balance.toFixed(2)}${colors.reset}`;
    }




  };