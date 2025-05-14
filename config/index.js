

// 集中管理所有配置

const strategy = process.argv.includes('--strategy=1') ? 'strategy1' : 'strategy2';


module.exports = {
    // Telegram API 配置
    telegram: {
      apiId: 25492029,
      apiHash: "e1d24b4e2041bcf59f203e4bb3bb6415",
      // sessionFile: "session.txt", // 会话文件路径
      sessionFile: strategy === 'strategy1' ? "session1.txt" : "session2.txt", // 修改点：动态会话文件
    },
  
    // 频道配置
    channels: {
      // 开奖频道
      lottery: -1001478681049, // PC28开奖频道-开奖结果查询
      // 公群频道
      public: -1001709162949, // 公群21 已押50万U 江湖PC28 2.0玩法
      // 目标群组
      // target: -4598766464, // 木木以及昌旺
      target: -1002625909003, // 木木以及昌旺  -1002625909003
    },
  
    // 投注方案配置
    betting: {
      // 方案1: 组合下注
      option1: ["大单47", "大双43", "小单43", "小双47"],
      
      // 方案2: 押数字下注
      option2: [
        {
          name: "小双",
          amount: 80,
          bets: ["4押6", "7押8", "10押10", "11押12", "6押7", "8押9", "10押11", "10押16", "8押18", "6押20"],
        },
        {
          name: "小单",
          amount: 88,
          bets: ["6押7", "8押9", "10押11", "11押15", "10押17", "7押19", "4押21", "4押6", "7押8", "10押10", "11押12"],
        },
        {
          name: "大单",
          amount: 80,
          bets: ["11押15", "10押17", "7押19", "4押21", "10押16", "8押18", "6押20", "6押7", "8押9", "10押11"],
        },
        {
          name: "大双",
          amount: 88,
          bets: ["10押16", "8押18", "6押20", "11押15", "10押17", "7押19", "4押21", "4押6", "7押8", "10押10", "11押12"],
        },
      ],
    },
  
    // 赔率表
    odds: {
      5: 46,
      6: 35,
      7: 27,
      8: 22,
      9: 18,
      10: 15.7,
      11: 14.4,
      12: 13.6,
      13: 13.3,
      14: 13.3,
      15: 13.6,
      16: 14.4,
      17: 15.7,
      18: 18,
      19: 22,
      20: 27,
      21: 35,
      22: 46,
    },
  
    // 止盈止损配置
    limits: {
      stopLoss: 5000,    // 止损点 (初始金额1000，亏损300停止)
      stopProfit: 19000, // 止盈点 (盈利300停止)
      initialBalance: 10000, // 初始金额
    },
  
    // 文件路径配置
    paths: {
      results: "data/results/results.json", // 开奖结果文件
      // bets: "data/bets/bets.json",         // 投注记录文件
      bets: strategy === 'strategy1' ? "data/bets1.json" : "data/bets2.json", // 修改点：动态投注记录文件
      tempBets: "temp_bets.json",          // 临时投注记录
    },
  
    // 其他设置
    settings: {
      maxRecords: 100,      // 最大记录条数
      heartbeatInterval: 50000, // 心跳间隔(毫秒)
      fetchLimit: 30,       // 获取最近消息条数
      betTimeout: 230000,   // 投注超时时间(毫秒)
    },
  };