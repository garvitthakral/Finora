import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

interface CategoryBreakdown {
  category: string;
  total: number;
}

interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: "INCOME" | "EXPENSE";
  transactionDate: string;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface NetBalance {
  income: number;
  expense: number;
  overAllBalance: number;
}

interface CurrMonthBalance {
  income: number;
  expense: number;
  overAllBalance: number;
}

interface Props {
  categoryBreakdown: CategoryBreakdown[];
  recentTransactions: Transaction[];
  monthlyTrend: MonthlyTrend[];
  netBalance: NetBalance;
  currMonthBalance: CurrMonthBalance;
}

const COLORS = ["#6C63FF", "#4ADE80", "#F87171", "#60A5FA"];

const DashboardContent = ({
  categoryBreakdown,
  recentTransactions,
  monthlyTrend,
  netBalance,
  currMonthBalance,
}: Props) => {
  return (
    <div className="space-y-8">
      {/* SUMMARY CARDS */}

      <div className="grid grid-cols-4 gap-6">
        <Card
          title="Net Balance"
          value={netBalance.overAllBalance}
          accentClass="from-[#6C63FF] to-[#60A5FA]"
          valueClass="text-[#A7A3FF]"
        />

        <Card
          title="Total Income"
          value={netBalance.income}
          accentClass="from-[#4ADE80] to-[#22C55E]"
          valueClass="text-green-300"
        />

        <Card
          title="Total Expenses"
          value={netBalance.expense}
          accentClass="from-[#F87171] to-[#EF4444]"
          valueClass="text-red-300"
        />

        <Card
          title="Current Month Balance"
          value={currMonthBalance.overAllBalance}
          accentClass="from-[#60A5FA] to-[#38BDF8]"
          valueClass="text-sky-300"
        />
      </div>

      {/* CHARTS */}

      <div className="grid grid-cols-2 gap-6">
        {/* CATEGORY PIE */}

        <div className="bg-[#16181F] p-6 rounded-xl">
          <h2 className="text-lg mb-4">Category Breakdown</h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                dataKey="total"
                nameKey="category"
                outerRadius={120}
              >
                {categoryBreakdown.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* MONTHLY TREND */}

        <div className="bg-[#16181F] p-6 rounded-xl">
          <h2 className="text-lg mb-4">Income vs Expense</h2>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2F3A" />

              <XAxis dataKey="month" stroke="#aaa" />

              <YAxis stroke="#aaa" />

              <Tooltip />

              <Legend />

              <Line
                type="monotone"
                dataKey="income"
                stroke="#4ADE80"
                strokeWidth={2}
              />

              <Line
                type="monotone"
                dataKey="expense"
                stroke="#F87171"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}

      <div className="bg-[#16181F] p-6 rounded-xl">
        <h2 className="text-lg mb-4">Recent Transactions</h2>

        <table className="w-full text-sm">
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="text-left py-2">Amount</th>
              <th className="text-left py-2">Category</th>
              <th className="text-left py-2">Type</th>
              <th className="text-left py-2">Date</th>
            </tr>
          </thead>

          <tbody>
            {recentTransactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-gray-800 hover:bg-[#1f2230]"
              >
                <td className="py-3">₹{tx.amount}</td>

                <td>{tx.category}</td>

                <td
                  className={
                    tx.type === "INCOME"
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {tx.type}
                </td>

                <td>
                  {new Date(tx.transactionDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardContent;

function Card({
  title,
  value,
  accentClass,
  valueClass,
}: {
  title: string;
  value: number;
  accentClass: string;
  valueClass: string;
}) {
  return (
    <div className="relative overflow-hidden bg-[#16181F] p-5 rounded-xl border border-gray-800/80">
      <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${accentClass}`} />
      <p className="text-gray-400 text-sm">{title}</p>

      <h3 className={`text-2xl font-semibold mt-2 ${valueClass}`}>₹{value}</h3>
    </div>
  );
}