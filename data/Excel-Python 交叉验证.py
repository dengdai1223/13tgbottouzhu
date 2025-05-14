

# 定期运行以下命令，确保统计一致性：
import pandas as pd
df = pd.read_excel("combined_profits.xlsx")
print("Excel校验结果:")
print(f"bets1 sum: {df['profit1'].sum():.2f}, count: {df['profit1'].count()}")
print(f"bets2 sum: {df['profit2'].sum():.2f}, count: {df['profit2'].count()}")