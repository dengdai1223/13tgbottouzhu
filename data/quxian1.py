import matplotlib.pyplot as plt
# import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
import json
import os



def load_profits(file_path):
    """从JSON文件加载期号和盈亏数据"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"错误：加载文件 {file_path} 失败 - {e}")
        return [], []

    bet_ids = []
    profits = []

    # 检查是 option1 还是 option2 数据
    bet_data = data.get("option1", {}) or data.get("option2", {})

    for bet_id, bet in bet_data.items():
        if "profit" in bet and bet.get("processed", False):
            bet_ids.append(bet_id)  # 提取期号（如 "3266703"）
            profits.append(bet["profit"])

    return bet_ids, profits


# # 文件路径（替换为你的实际路径）
# file1 = "bets1-1.json"
# file2 = "bets2-2.json"

# 文件路径（替换为你的实际路径）
file1 = "bets1.json"
file2 = "bets2.json"

# 加载数据
bet_ids1, profits1 = load_profits(file1)
bet_ids2, profits2 = load_profits(file2)

if not bet_ids1 or not bet_ids2:
    print("错误：数据为空，请检查文件内容！")
else:
    # 计算累计盈亏
    cumulative1 = [sum(profits1[:i + 1]) for i in range(len(profits1))]
    cumulative2 = [sum(profits2[:i + 1]) for i in range(len(profits2))]

    # 计算最终盈亏
    final_profit1 = cumulative1[-1]
    final_profit2 = cumulative2[-1]


    # 计算胜率（盈利次数 / 总次数）
    wins1 = sum(1 for p in profits1 if p > 0)
    wins2 = sum(1 for p in profits2 if p > 0)
    win_rate1 = wins1 / len(profits1) * 100
    win_rate2 = wins2 / len(profits2) * 100

    # 打印最终盈亏结果
    print("\n===== 最终盈亏统计 =====")
    print(f"bets1 总盈亏: {final_profit1:.2f} | 总下注次数: {len(profits1)} | 胜率: {win_rate1:.1f}%")
    print(f"bets2 总盈亏: {final_profit2:.2f} | 总下注次数: {len(profits2)} | 胜率: {win_rate2:.1f}%")
    print("=======================")



    # 绘制曲线
    plt.figure(figsize=(12, 6))

    # 使用系统自带的中文字体（如SimHei、Microsoft YaHei等）
    plt.rcParams['font.sans-serif'] = ['SimHei']  # 设置默认字体为黑体
    plt.rcParams['axes.unicode_minus'] = False  # 解决负号显示问题

    # 使用期号作为横坐标
    plt.plot(bet_ids1, cumulative1, label="bets1", color="red", linewidth=1.5, marker='o', markersize=4)
    plt.plot(bet_ids2, cumulative2, label="bets2", color="blue", linewidth=1.5, marker='s', markersize=4)

    # 在右上角标注最终盈亏
    plt.text(0.95, 0.95, f"bets1 最终: {final_profit1:.2f}\nbets2 最终: {final_profit2:.2f}",
             transform=plt.gca().transAxes, ha='right', va='top',
             bbox=dict(facecolor='white', alpha=0.8, edgecolor='gray'))


    # 图表美化
    plt.xlabel("期号", fontsize=12)
    plt.ylabel("累计盈亏", fontsize=12)
    plt.title("按期号对比资金曲线", fontsize=14)
    plt.axhline(0, color="gray", linestyle="--")

    # 调整横坐标显示（避免重叠）
    plt.xticks(rotation=45, fontsize=8)  # 旋转45度并缩小字体
    plt.legend(fontsize=12)
    plt.grid(True, alpha=0.3)

    # 自动调整布局
    plt.tight_layout()
    plt.show()