
// core\dbWriter.js
const mysql = require('mysql2/promise');
const chalk = require('chalk');
const logger = require('../utils/logger');
const lottery = require('./lottery'); // 引入 lottery 模块获取历史数据

class DBWriter {
    constructor() {
        this.connection = null;
        this.initialized = false;
        this.maxGapThreshold = 30; // 最大允许期数间隔
        this.pendingQueue = [];
        this.connectionStatus = 'unknown';
        this._startHeartbeat();
    }



    async init() {
        try {
            this.connection = await mysql.createConnection({
                host: 'localhost',
                user: 'wbp1223',
                password: '889966',
                database: 'pc28kj',
                timezone: '+08:00', // 新增时区配置
                connectTimeout: 10000

            });
            
            await this.connection.ping();
            this.initialized = true;
            logger.info('数据库连接成功');
            
            // 初始化时检查数据库状态
            await this.checkDatabaseConsistency();
        } catch (err) {
            logger.error('数据库连接失败:', err);
            this.initialized = false;
            setTimeout(() => this.init(), 10000);
        }
    }


    // 获取数据库中最大期号
    async getMaxQishu() {
        try {
            const [rows] = await this.connection.execute(
                'SELECT MAX(qishu) AS maxQishu FROM lottery_results'
            );
            return rows[0].maxQishu || 0;
        } catch (err) {
            logger.error('获取最大期号失败:', err);
            return 0;
        }
    }

    // 检查数据库一致性
    async checkDatabaseConsistency() {
        try {
            const maxQishu = await this.getMaxQishu();
            if (maxQishu > 0) {
                // 计算最近300期的起始期号（避免负数）
                const checkStart = Math.max(1, maxQishu - 299); // 例如 max=300 → 检查 1-300
                // 检查是否有缺失的期号
                // 修改SQL查询范围（参数化防止注入）
                const [gapRows] = await this.connection.execute(
                    `SELECT t1.qishu + 1 AS missing_qishu
                    FROM lottery_results t1
                    LEFT JOIN lottery_results t2 ON t1.qishu + 1 = t2.qishu
                    WHERE t2.qishu IS NULL 
                    AND t1.qishu >= ? 
                    AND t1.qishu < ?`, // 范围限定
                    [checkStart, maxQishu]
                );
                
                if (gapRows.length > 0) {
                    // logger.warn(`发现 ${gapRows.length} 个缺失的期号，最大期号: ${maxQishu}`);
                    logger.warn(`最近300期中发现 ${gapRows.length} 处断档，检查范围: ${checkStart}-${maxQishu}`);
                    if (gapRows.length > this.maxGapThreshold) {
                        await this.fetchAndFillMissingData(maxQishu);
                    }
                }
            }
        } catch (err) {
            logger.error('数据库一致性检查失败:', err);
        }
    }

    // 获取并填充缺失数据
    async fetchAndFillMissingData(currentMaxQishu) {
        try {
            logger.info('开始获取缺失的历史数据...');
            
            // 1. 从 lottery 模块获取所有历史数据
            await lottery.fetchRecentResults();
            const allResults = lottery.results || [];
            // 数据筛选逻辑（兼容空值处理）
            const maxResults = 300;
            const limitedResults = (lottery.results || [])
            .filter(Boolean) // 过滤无效数据
            .sort((a, b) => parseInt(a.period) - parseInt(b.period)) // 保持原有排序
            .slice(-maxResults); // 取最后300期（假设期号递增）


                        
            // 2. 筛选需要补充的数据
            const resultsToInsert = limitedResults
                .filter(result => {
                    const qishu = parseInt(result.period);
                    return qishu > currentMaxQishu || 
                          (qishu <= currentMaxQishu && qishu > currentMaxQishu - this.maxGapThreshold);
                })
                .sort((a, b) => parseInt(a.period) - parseInt(b.period));
            
            // 3. 批量插入数据
            if (resultsToInsert.length > 0) {
                logger.info(`准备补充 ${resultsToInsert.length} 条历史数据...`);
                let successCount = 0;
                
                for (const result of resultsToInsert) {
                    const inserted = await this._insertSingleResult(result);
                    if (inserted) successCount++;
                }
                
                logger.success(`成功补充 ${successCount}/${resultsToInsert.length} 条历史数据`);
            } else {
                logger.info('没有需要补充的历史数据');
            }
        } catch (err) {
            logger.error('获取历史数据失败:', err);
        }
    }

    // 写入单个结果（内部方法）
    // async _insertSingleResult(result) {
    //     try {
    //         const { period, details, result: sum } = result;
    //         const [num1, num2, num3] = details.split(',').map(Number);
            
    //         // 检查是否已存在
    //         const [rows] = await this.connection.execute(
    //             'SELECT COUNT(*) AS count FROM lottery_results WHERE qishu = ?',
    //             [period]
    //         );
            
    //         if (rows[0].count > 0) {
    //             logger.debug(`期数 ${period} 已存在，跳过写入`);
    //             return false;
    //         }

    //         // 格式化时间
    //         const openTime = result.time 
    //             ? new Date(result.time * 1000)
    //             : new Date();
    //         const formattedTime = openTime.toISOString().slice(0, 19).replace('T', ' ');

    //         // 执行写入
    //         await this.connection.execute(
    //             'INSERT INTO lottery_results (qishu, open_time, num1, num2, num3, sum) VALUES (?, ?, ?, ?, ?, ?)',
    //             [period, formattedTime, num1, num2, num3, sum]
    //         );

    //         logger.debug(`写入期数: ${period}: ${num1} + ${num2} + ${num3} = ${sum}`);
    //         return true;
    //     } catch (err) {
    //         logger.error(`写入期数 ${result.period} 失败:`, err);
    //         return false;
    //     }
    // }






















        async _insertSingleResult(result) {
            let retries = 3;
            while (retries > 0) {
                try {
                    //======= 字段解析与标准化 =======//
                    const { period, details: rawDetails, result: sum } = result;
                    const normalizedDetails = rawDetails.replace(/[+]/g, ','); // 统一分隔符
    
                    //======= 数据格式验证 =======//
                    if (!/^\d{1,2}(,\d{1,2}){2}$/.test(normalizedDetails)) {
                        logger.error(`期数 ${period} 格式错误，应为数字,数字,数字 (当前值: ${rawDetails})`);
                        return false;
                    }
    
                    //======= 数值分解与验证 =======//
                    const [num1, num2, num3] = normalizedDetails.split(',').map(n => {
                        const num = parseInt(n, 10);
                        if (isNaN(num) || num < 0 || num > 9) {
                            throw new Error(`无效数字: ${n}`);
                        }
                        return num;
                    });
    
                    //======= sum校验 =======//
                    const calculatedSum = num1 + num2 + num3;
                    if (calculatedSum !== parseInt(sum, 10)) {
                        logger.error(`期数 ${period} sum校验失败 (计算值:${calculatedSum} vs 数据值:${sum})`);
                        return false;
                    }
    
                    //======= 存在性检查 =======//
                    const [rows] = await this.connection.execute(
                        'SELECT COUNT(*) AS count FROM lottery_results WHERE qishu = ?',
                        [period]
                    );
                    if (rows[0].count > 0) {
                        logger.debug(`期数 ${period} 已存在，跳过写入`);
                        return false;
                    }
    
                    //======= 时间处理增强 =======//
                    let openTime;
                    if (result.timestamp) { 
                        openTime = new Date(result.timestamp);
                    } else if (result.time) { 
                        openTime = new Date(result.time * 1000);
                    } else {
                        openTime = new Date();
                        logger.warn(`期数 ${period} 缺少时间字段，使用当前时间`);
                    }


                    // 原代码（错误）
                    // const formattedTime = openTime.toISOString().slice(0, 19).replace('T', ' ');

                    // 修改后（正确）
                    const formattedTime = openTime.toLocaleString('zh-CN', { 
                        timeZone: 'Asia/Shanghai',
                        hour12: false 
                    }).replace(/\//g, '-').replace(/,/, '');
                    // 输出示例: "2025-05-03 02:29:41"


    
                    //======= 执行写入 =======//
                    await this.connection.execute(
                        'INSERT INTO lottery_results (qishu, open_time, num1, num2, num3, sum) VALUES (?, ?, ?, ?, ?, ?)',
                        [period, formattedTime, num1, num2, num3, sum]
                    );
    
                    logger.debug(`成功写入期数: ${period}: ${num1}+${num2}+${num3}=${sum}`);
                    return true;
    
                } catch (err) {
                    retries--;
                    if (retries === 0) {
                        logger.error(`写入期数 ${result.period} 最终失败: ${err.message}`);
                        return false;
                    }
                    logger.warn(`写入错误重试 (剩余 ${retries} 次): ${err.message}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
                }
            }
            return false;
        }
    

























    //======= 新增验证方法 =======//
    _validateResultData(result) {
        const requiredFields = ['period', 'details', 'result'];
        const missingFields = requiredFields.filter(f => !result.hasOwnProperty(f));
        
        if (missingFields.length > 0) {
            logger.error(`缺失必要字段: ${missingFields.join(',')} (期数: ${result.period || '未知'})`);
            return false;
        }
        
        if (!/^\d+$/.test(result.period)) {
            logger.error(`期号格式错误: ${result.period}`);
            return false;
        }
        
        return true;
    }










    // 主写入方法
    // 修改后的 writeResult 方法（在 dbWriter.js 中）


    async writeResult(result) {
        // 队列检查
        if (!this.isReady) {
            logger.warn('数据库未就绪，加入写入队列');
            this.pendingQueue.push(result);
            return { 
                queued: true,
                period: result.period,
                timestamp: Date.now()
            };
        }

        try {
            // 期号连续性检查
            const currentQishu = parseInt(result.period);
            const maxQishu = await this.getMaxQishu();
            
            // 缺口超过阈值时补数
            if (currentQishu - maxQishu > this.maxGapThreshold) {
                logger.warn(`检测到期号不连续 (当前: ${currentQishu}, 数据库最大: ${maxQishu})`);
                await this.fetchAndFillMissingData(maxQishu);
            }

            // 执行写入
            const inserted = await this._insertSingleResult(result);
            return { 
                success: true,
                period: result.period,
                inserted,
                gapFilled: currentQishu - maxQishu > 1
            };
        } catch (err) {
            logger.error('写入数据库失败:', err);
            console.log(result);
            return {
                success: false,
                error: err.message,
                error: err.message || '未知数据库错误',
                period: result?.period || '未知期号'
            };
        }
    }



















      // 新增心跳检测方法
      _startHeartbeat() {
        setInterval(async () => {
        if (!this.isReady) return;
        try {
            await this.connection.ping();
            this.connectionStatus = 'healthy';
        } catch (err) {
            this.connectionStatus = 'unstable';
            logger.warn('数据库连接异常:', err.message);
        }
        }, 60000);
    }


    // 新增队列处理方法
    async _processQueue() {
        while (this.pendingQueue.length > 0 && this.isReady) {
          const result = this.pendingQueue.shift();
          await this._insertSingleResult(result);
        }
      }
    

    // 批量写入方法（用于初始化数据）
    async batchWriteResults(results) {
        if (!this.initialized) {
            throw new Error('Database not initialized');
        }

        try {
            // 按期号排序
            const sortedResults = results
                .map(r => ({
                    ...r,
                    _qishu: parseInt(r.period)
                }))
                .sort((a, b) => a._qishu - b._qishu);
            
            let successCount = 0;
            
            for (const result of sortedResults) {
                const inserted = await this._insertSingleResult(result);
                if (inserted) successCount++;
            }
            
            return {
                total: sortedResults.length,
                success: successCount,
                failed: sortedResults.length - successCount
            };
        } catch (err) {
            logger.error('批量写入失败:', err);
            throw err;
        }
    }

    async close() {
        if (this.connection) {
            try {
                await this.connection.end();
                logger.info('数据库连接已关闭');
            } catch (err) {
                logger.error('关闭数据库连接时出错:', err);
            }
        }
    }
}


// DBWriter()

module.exports = new DBWriter();