
import json
import pandas as pd
from collections import defaultdict

def load_profits(file_path):
    """从JSON文件加载期号和盈亏数据"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"错误：加载文件 {file_path} 失败 - {e}")
        return {}

    profits = {}
    # 检查是 option1 还是 option2 数据
    bet_data = data.get("option1", {}) or data.get("option2", {})

    for bet_id, bet in bet_data.items():
        if "profit" in bet and bet.get("processed", False):
            profits[bet_id] = bet["profit"]

    return profits

# 加载数据
file1 = "bets1.json"
file2 = "bets2.json"

profits1 = load_profits(file1)  # {期号: profit1}
profits2 = load_profits(file2)  # {期号: profit2}

# 合并所有期号（去重并排序）
all_bet_ids = sorted(set(profits1.keys()) | set(profits2.keys()), key=int)

# 构建数据表
data = []
for bet_id in all_bet_ids:
    row = {
        "期号": bet_id,
        "profit1": profits1.get(bet_id, ""),  # 没有数据用空值
        "profit2": profits2.get(bet_id, ""),  # 没有数据用空值
    }
    data.append(row)

# 转换为DataFrame
df = pd.DataFrame(data)

# 导出到Excel
output_file = "combined_profits.xlsx"
df.to_excel(output_file, index=False)

print(f"数据已成功导出到 {output_file}")