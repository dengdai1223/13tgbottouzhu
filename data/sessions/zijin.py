
import matplotlib.pyplot as plt
import json

def plot_profit_curve(file_path, title):
    with open(file_path, 'r') as f:
        data = json.load(f)

    profits = []
    if "option1" in data and data["option1"]:
        for bet in data["option1"].values():
            if "profit" in bet and bet["processed"]:
                profits.append(bet["profit"])
    elif "option2" in data and data["option2"]:
        for bet in data["option2"].values():
            if "profit" in bet and bet["processed"]:
                profits.append(bet["profit"])

    cumulative = [sum(profits[: i +1]) for i in range(len(profits))]

    plt.plot(cumulative, label=title)
    plt.xlabel("投注次数")
    plt.ylabel("累计盈亏")
    plt.axhline(0, color='gray', linestyle='--')
    plt.legend()

plot_profit_curve("bets1.json", "bets1")
plot_profit_curve("bets2.json", "bets2")
plt.show()