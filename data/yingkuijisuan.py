import json


def precise_stats(file_path):
    """精确统计盈亏数据"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    total = 0.0
    count = 0

    # 检查 option1 和 option2 的数据
    for bet_type in ["option1", "option2"]:
        if bet_type in data:
            for bet in data[bet_type].values():
                if bet.get("processed", False) and "profit" in bet:
                    try:
                        total += float(bet["profit"])
                        count += 1
                    except (ValueError, TypeError):
                        print(f"警告：无效的profit值 - 期号 {bet.get('name', '未知')}, 值: {bet['profit']}")

    if count == 0:
        print(f"警告：文件 {file_path} 中没有有效数据！")
        return

    print(f"文件: {file_path}")
    print(f"总盈亏: {total:.2f}")
    print(f"总投注次数: {count}")
    print(f"平均盈亏: {total / count:.2f}\n")


# 调用函数
precise_stats("bets1.json")
precise_stats("bets2.json")