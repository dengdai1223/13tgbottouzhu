import matplotlib.pyplot as plt
import json
import os


def plot_profit_curve(file_path, title):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"错误：文件 {file_path} 不存在！")
        return
    except json.JSONDecodeError:
        print(f"错误：文件 {file_path} 不是有效的 JSON 格式！")
        return

    profits = []
    if "option1" in data and data["option1"]:
        for bet in data["option1"].values():
            if "profit" in bet and bet.get("processed", False):
                profits.append(bet["profit"])
    elif "option2" in data and data["option2"]:
        for bet in data["option2"].values():
            if "profit" in bet and bet.get("processed", False):
                profits.append(bet["profit"])

    if not profits:
        print(f"警告：文件 {file_path} 中没有有效的盈亏数据！")
        return

    cumulative = [sum(profits[:i + 1]) for i in range(len(profits))]

    plt.plot(cumulative, label=title)
    plt.xlabel("投注次数")
    plt.ylabel("累计盈亏")
    plt.axhline(0, color='gray', linestyle='--')
    plt.legend()
    plt.title(f"{title} 资金曲线")
    plt.grid(True)
    plt.show()


# 替换为你的实际文件路径
file1 = "E:/13、tgbottouzhu/data/bets1.json"
file2 = "E:/13、tgbottouzhu/data/bets2.json"

if os.path.exists(file1) and os.path.exists(file2):
    plot_profit_curve(file1, "bets1")
    plot_profit_curve(file2, "bets2")
else:
    print("错误：请检查文件路径是否正确！")