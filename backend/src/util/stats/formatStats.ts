export function formatDashboardData({
  summaryData,
  categoryBreakdown,
  monthlyTrend,
  currMonthData,
  recentTransactions,
}: any) {
  const formattedSummary = {
    INCOME: Number(
      summaryData.find((s: any) => s.type === "INCOME")?._sum.amount ?? 0,
    ),
    EXPENSE: Number(
      summaryData.find((s: any) => s.type === "EXPENSE")?._sum.amount ?? 0,
    ),
  };

  const formattedCategoryBreakdown = categoryBreakdown.map((c: any) => ({
    category: c.category,
    total: Number(c._sum.amount),
  }));

  const formattedMonthlyTrend = monthlyTrend.map((m: any) => ({
    month: m.month.toISOString().split("T")[0],
    income: Number(m.income),
    expense: Number(m.expense),
    balance: Number(m.income) - Number(m.expense),
  }));

  const netBalance = {
    income: formattedSummary.INCOME,
    expense: formattedSummary.EXPENSE,
    overAllBalance: formattedSummary.INCOME - formattedSummary.EXPENSE,
  };

  const formattedCurrMonthData = {
    income: Number(
      currMonthData.find((s: any) => s.type === "INCOME")?._sum.amount ?? 0,
    ),
    expense: Number(
      currMonthData.find((s: any) => s.type === "EXPENSE")?._sum.amount ?? 0,
    ),
  };

  const currMonthBalance = {
    income: formattedCurrMonthData.income,
    expense: formattedCurrMonthData.expense,
    overAllBalance:
      formattedCurrMonthData.income - formattedCurrMonthData.expense,
  };

  const formattedRecentTransactions = recentTransactions.map((t: any) => ({
    id: t.id,
    amount: Number(t.amount),
    category: t.category,
    type: t.type,
    transactionDate: t.transactionDate.toISOString(),
  }));

  return {
    formattedCategoryBreakdown,
    formattedMonthlyTrend,
    netBalance,
    currMonthBalance,
    formattedRecentTransactions,
  };
}
