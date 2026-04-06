import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/useAuth";

type TransactionRow = {
  id: string;
  amount: string; // API returns strings
  currency: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  notes: string | null;
  transactionDate: string; // ISO
  isFirstTransactionOfDay: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type GetTransactionsResponse = {
  success: true;
  message: string;
  data: {
    transactions: TransactionRow[];
    total: number;
    page: number;
    totalPages: number;
  };
};

type ViewTransactionResponse = {
  success: true;
  message: string;
  data: TransactionRow;
};

type CreateTransactionResponse = {
  success: true;
  message: string;
  data: {
    transaction: TransactionRow;
  };
};

type Filters = {
  page: number;
  limit: number;
  type?: "INCOME" | "EXPENSE";
  category?: string;
  minAmount?: string; // send as string
  maxAmount?: string; // send as string
  startDate?: string; // yyyy-mm-dd
  endDate?: string; // yyyy-mm-dd
  sortBy: "amount" | "transactionDate" | "category";
  order: "asc" | "desc";
};

function parseSearch(search: string): Filters {
  const p = new URLSearchParams(search);
  const page = Math.max(1, Number(p.get("page") || 1));
  const limit = Math.min(
    100,
    Math.max(1, Number(p.get("limit") || 10)),
  );
  const type = (p.get("type") as Filters["type"]) || undefined;
  const category = p.get("category") || undefined;
  const minAmount = p.get("minAmount") || undefined;
  const maxAmount = p.get("maxAmount") || undefined;
  const startDate = p.get("startDate") || undefined;
  const endDate = p.get("endDate") || undefined;
  const sortBy =
    (p.get("sortBy") as Filters["sortBy"]) || "transactionDate";
  const order = (p.get("order") as Filters["order"]) || "desc";

  return {
    page,
    limit,
    type,
    category,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    sortBy,
    order,
  };
}

export default function UserTransactionsPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation() as { state?: { user?: any } };
  const navigate = useNavigate();
  const { token, user: authUser } = useAuth();

  const [filters, setFilters] = useState<Filters>(() => parseSearch(window.location.search));
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TransactionRow | null>(null);

  // Derived validation for UI feedback
  const rangeError = useMemo(() => {
    if (filters.minAmount && filters.maxAmount) {
      const min = Number(filters.minAmount);
      const max = Number(filters.maxAmount);
      if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
        return "Min amount cannot exceed max amount";
      }
    }
    if (filters.startDate && filters.endDate) {
      const s = Date.parse(filters.startDate);
      const e = Date.parse(filters.endDate);
      if (!Number.isNaN(s) && !Number.isNaN(e) && s > e) {
        return "Start date cannot be after end date";
      }
    }
    return null;
  }, [filters.minAmount, filters.maxAmount, filters.startDate, filters.endDate]);

  const fetchData = async (opts?: Partial<Filters>) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const f = { ...filters, ...(opts || {}) };

      const baseUrl =
        import.meta.env.VITE_GET_TRANSACTIONS_URL ||
        `${import.meta.env.VITE_API_BASE_URL}/api/transaction/get-transactions`;

      const params: Record<string, string> = {
        page: String(f.page ?? 1),
        limit: String(f.limit ?? 10),
        sortBy: f.sortBy,
        order: f.order,
      } as any;

      if (f.type) params.type = f.type;
      if (f.category) params.category = f.category;
      if (f.minAmount) params.minAmount = f.minAmount;
      if (f.maxAmount) params.maxAmount = f.maxAmount;
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;

      const res = await axios.get<GetTransactionsResponse>(baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setRows(res.data.data.transactions);
      setPage(res.data.data.page);
      setTotalPages(res.data.data.totalPages);
      setTotal(res.data.data.total);
      setInitialLoaded(true);

      // sync URL after first load
      const sp = new URLSearchParams(params);
      navigate({ pathname: `/users/${id}/transactions`, search: `?${sp.toString()}` }, { replace: true, state });
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        navigate("/unauthorized", { replace: true });
        return;
      }
      const message = e instanceof Error ? e.message : "Failed to fetch transactions";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load: fetch first, then enable filters
  useEffect(() => {
    fetchData({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;

  const initials = useMemo(() => {
    const n: string = state?.user?.name || state?.user?.email || "?";
    const parts = n.split(/[\s@._-]+/).filter(Boolean);
    const a = (parts[0]?.[0] || "?").toUpperCase();
    const b = (parts[1]?.[0] || "").toUpperCase();
    return `${a}${b}`.trim();
  }, [state?.user]);

  const prettyDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      weekday: "short",
    });

  const prettyDateTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const openDetail = async (txId: string) => {
    if (!token) return;
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);

    try {
      const baseUrl =
        import.meta.env.VITE_VIEW_TRANSACTION_URL ||
        `${import.meta.env.VITE_API_BASE_URL}/api/transaction/view-records`;
      const url = `${baseUrl}/${txId}`;

      const res = await axios.get<ViewTransactionResponse>(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetail(res.data.data);
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        navigate("/unauthorized", { replace: true });
        return;
      }
      const message = e instanceof Error ? e.message : "Failed to load transaction";
      setDetailError(message);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C1F2A] text-white">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#9b8cff] grid place-items-center text-sm font-semibold">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Transactions</h2>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{state?.user?.email || id}</span>
                {state?.user?.role && (
                  <span className="px-2 py-0.5 rounded-full bg-[#16181F] border border-gray-800 text-gray-300">
                    {state.user.role}
                  </span>
                )}
              </div>
              {authUser?.id && id && authUser.id !== id && (
                <p className="text-xs text-amber-300 mt-1">
                  Note: API lists transactions for the currently authenticated user only.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {authUser?.role === "ADMIN" && (
              <AddTransactionButton
                token={token}
                userId={id as string}
                onCreated={() => {
                  // reload from page 1 to surface the new item
                  const next = { ...filters, page: 1 };
                  setFilters(next);
                  fetchData(next);
                }}
              />
            )}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm px-3 py-2 rounded-lg bg-[#16181F] border border-gray-800 hover:bg-[#14161c] transition-colors"
            >
              Back
            </button>
          </div>
        </div>

        {/* Filters: show only after first successful load */}
        {initialLoaded && (
          <div className="bg-[#16181F] p-4 rounded-xl border border-gray-800">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs text-gray-400">Quick range:</span>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-lg border border-gray-800 hover:bg-[#14161c]"
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 6);
                  const toISO = (d: Date) => d.toISOString().slice(0, 10);
                  const next = {
                    ...filters,
                    page: 1,
                    startDate: toISO(start),
                    endDate: toISO(end),
                  } as Filters;
                  setFilters(next);
                }}
              >
                Last 7 days
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-lg border border-gray-800 hover:bg-[#14161c]"
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 29);
                  const toISO = (d: Date) => d.toISOString().slice(0, 10);
                  const next = {
                    ...filters,
                    page: 1,
                    startDate: toISO(start),
                    endDate: toISO(end),
                  } as Filters;
                  setFilters(next);
                }}
              >
                Last 30 days
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-lg border border-gray-800 hover:bg-[#14161c]"
                onClick={() => {
                  const now = new Date();
                  const next = {
                    ...filters,
                    page: 1,
                    startDate: `${now.getFullYear()}-01-01`,
                    endDate: now.toISOString().slice(0, 10),
                  } as Filters;
                  setFilters(next);
                }}
              >
                YTD
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400" htmlFor="type">Type</label>
              <select
                id="type"
                value={filters.type || ""}
                onChange={(e) => setFilters((f) => ({ ...f, page: 1, type: (e.target.value || undefined) as any }))}
                className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="">All</option>
                <option value="INCOME">INCOME</option>
                <option value="EXPENSE">EXPENSE</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400" htmlFor="category">Category</label>
              <input
                id="category"
                value={filters.category || ""}
                onChange={(e) => setFilters((f) => ({ ...f, page: 1, category: e.target.value || undefined }))}
                className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
                placeholder="Exact match"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400" htmlFor="minAmount">Min amount</label>
                <input
                  id="minAmount"
                  type="number"
                  min={0}
                  value={filters.minAmount || ""}
                  onChange={(e) => setFilters((f) => ({ ...f, page: 1, minAmount: e.target.value || undefined }))}
                  className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400" htmlFor="maxAmount">Max amount</label>
                <input
                  id="maxAmount"
                  type="number"
                  min={0}
                  value={filters.maxAmount || ""}
                  onChange={(e) => setFilters((f) => ({ ...f, page: 1, maxAmount: e.target.value || undefined }))}
                  className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400" htmlFor="startDate">Start date</label>
                <input
                  id="startDate"
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) => setFilters((f) => ({ ...f, page: 1, startDate: e.target.value || undefined }))}
                  className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400" htmlFor="endDate">End date</label>
                <input
                  id="endDate"
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(e) => setFilters((f) => ({ ...f, page: 1, endDate: e.target.value || undefined }))}
                  className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400" htmlFor="sortBy">Sort by</label>
              <select
                id="sortBy"
                value={filters.sortBy}
                onChange={(e) => setFilters((f) => ({ ...f, page: 1, sortBy: e.target.value as Filters["sortBy"] }))}
                className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="amount">amount</option>
                <option value="transactionDate">transactionDate</option>
                <option value="category">category</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400" htmlFor="order">Order</label>
              <select
                id="order"
                value={filters.order}
                onChange={(e) => setFilters((f) => ({ ...f, page: 1, order: e.target.value as Filters["order"] }))}
                className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="desc">desc</option>
                <option value="asc">asc</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3 items-end">
              <button
                type="button"
                disabled={loading || !!rangeError}
                onClick={() => fetchData({ ...filters })}
                className="text-sm px-3 py-2 rounded-lg bg-[#6C63FF] hover:bg-[#5b54e6] transition-colors disabled:opacity-50"
              >
                Apply
              </button>
              <div>
                <label className="text-xs text-gray-400" htmlFor="limit">Page size</label>
                <select
                  id="limit"
                  value={filters.limit}
                  onChange={(e) => setFilters((f) => ({ ...f, page: 1, limit: Number(e.target.value) }))}
                  className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const reset: Filters = {
                    page: 1,
                    limit: 10,
                    sortBy: "transactionDate",
                    order: "desc",
                  };
                  setFilters(reset);
                  fetchData(reset);
                }}
                className="text-sm px-3 py-2 rounded-lg bg-transparent border border-gray-800 hover:bg-[#14161c] transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
          {rangeError && (
            <p className="text-xs text-red-300 mt-2">{rangeError}</p>
          )}
        </div>
        )}

        <div className="bg-[#16181F] p-6 rounded-xl border border-gray-800">
          {error && (
            <div className="mb-4 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading && !initialLoaded ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-[#1C1F2A] rounded animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-gray-400 py-8 grid place-items-center">
              <div className="text-3xl mb-2">🍃</div>
              <div>No transactions match your filters.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#16181F] z-10 text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="text-left py-2 pr-4">Date</th>
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-left py-2 pr-4">Category</th>
                    <th className="text-right py-2 pr-4">Amount</th>
                    <th className="text-left py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <Fragment key={t.id}>
                      {filters.sortBy === "transactionDate" && t.isFirstTransactionOfDay && (
                        <tr className="bg-[#0F1117]">
                          <td colSpan={5} className="py-2 px-3 text-xs text-gray-400">
                            {prettyDate(t.transactionDate)}
                          </td>
                        </tr>
                      )}
                      <tr
                        onClick={() => openDetail(t.id)}
                        className="border-b border-gray-800 hover:bg-[#1f2230] cursor-pointer"
                      >
                        <td className="py-3 pr-4 align-middle">{new Date(t.transactionDate).toLocaleDateString()}</td>
                        <td className="py-3 pr-4 align-middle">
                          <span
                            className={
                              t.type === "INCOME"
                                ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            }
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 pr-4 align-middle">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs bg-[#1C1F2A] border border-gray-800 text-gray-300">
                            {t.category}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right align-middle font-mono tabular-nums">
                          <span className={t.type === "INCOME" ? "text-emerald-300" : "text-rose-300"}>
                            {t.amount}
                          </span>{" "}
                          <span className="text-gray-400">{t.currency}</span>
                        </td>
                        <td className="py-3 align-middle text-gray-300">{t.notes || "-"}</td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 gap-3">
            <p className="text-xs text-gray-500">
              Showing {rows.length} of {total} · Page {page} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => {
                  const next = { ...filters, page: Math.max(1, page - 1) };
                  setFilters(next);
                  fetchData(next);
                }}
                className="text-sm px-3 py-2 rounded-lg bg-transparent border border-gray-800 hover:bg-[#14161c] transition-colors disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-sm text-gray-300 px-3 py-2 rounded-lg border border-gray-800">
                {page} / {totalPages}
              </div>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => {
                  const next = { ...filters, page: Math.min(totalPages, page + 1) };
                  setFilters(next);
                  fetchData(next);
                }}
                className="text-sm px-3 py-2 rounded-lg bg-transparent border border-gray-800 hover:bg-[#14161c] transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      <DetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        loading={detailLoading}
        error={detailError}
        tx={detail}
        prettyDate={prettyDate}
        prettyDateTime={prettyDateTime}
      />
    </div>
  );
}

function DetailModal({
  open,
  onClose,
  loading,
  error,
  tx,
  prettyDate,
  prettyDateTime,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  tx: TransactionRow | null;
  prettyDate: (iso: string) => string;
  prettyDateTime: (iso: string) => string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Transaction details">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close transaction details"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-[#0F1117] overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-gray-800">
            <h3 className="text-lg font-semibold">Transaction</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-3 py-2 rounded-lg bg-transparent border border-gray-800 hover:bg-[#14161c] transition-colors"
            >
              Close
            </button>
          </div>

          <div className="p-5 space-y-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 bg-[#1C1F2A] rounded animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : tx ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Amount</div>
                  <div className="font-mono tabular-nums">
                    {tx.amount} <span className="text-gray-400">{tx.currency}</span>
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Type</div>
                  <div>
                    <span
                      className={
                        tx.type === "INCOME"
                          ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      }
                    >
                      {tx.type}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Category</div>
                  <div className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs bg-[#1C1F2A] border border-gray-800 text-gray-300">
                    {tx.category}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Business date</div>
                  <div>{prettyDate(tx.transactionDate)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Created</div>
                  <div>{prettyDateTime(tx.createdAt)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Updated</div>
                  <div>{prettyDateTime(tx.updatedAt)}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-gray-400">Notes</div>
                  <div className="text-gray-300 whitespace-pre-wrap">{tx.notes || "-"}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-gray-400">ID</div>
                  <div className="font-mono text-xs text-gray-400">{tx.id}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddTransactionButton({
  token,
  userId,
  onCreated,
}: {
  token: string | null;
  userId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const canSubmit =
    !!token &&
    !submitting &&
    Number(amount) > 0 &&
    category.trim().length > 0 &&
    !!date;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const baseUrl =
        import.meta.env.VITE_CREATE_TRANSACTION_URL ||
        `${import.meta.env.VITE_API_BASE_URL}/api/transaction/create-record`;
      await axios.post<CreateTransactionResponse>(
        baseUrl,
        {
          userId,
          amount: Number(amount),
          type,
          category: category.trim(),
          notes: notes.trim() || undefined,
          date, // backend parses new Date(date)
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setOpen(false);
      setAmount("");
      setCategory("");
      setNotes("");
      onCreated();
    } catch (e) {
      const message = (e as any)?.response?.data?.message || (e instanceof Error ? e.message : "Failed to create transaction");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-2 rounded-lg bg-[#6C63FF] hover:bg-[#5b54e6] transition-colors"
      >
        Add Transaction
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Add transaction">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close add transaction modal"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-[#0F1117] overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-gray-800">
                <h3 className="text-lg font-semibold">Add transaction</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm px-3 py-2 rounded-lg bg-transparent border border-gray-800 hover:bg-[#14161c] transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="p-5 space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400" htmlFor="txType">Type</label>
                    <select
                      id="txType"
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
                    >
                      <option value="EXPENSE">EXPENSE</option>
                      <option value="INCOME">INCOME</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400" htmlFor="txAmount">Amount</label>
                    <input
                      id="txAmount"
                      type="number"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400" htmlFor="txCategory">Category</label>
                  <input
                    id="txCategory"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
                    placeholder="e.g., Food, Salary, Utilities"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400" htmlFor="txNotes">Notes</label>
                  <textarea
                    id="txNotes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none min-h-20"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400" htmlFor="txDate">Date</label>
                  <input
                    id="txDate"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm px-4 py-2 rounded-lg bg-transparent border border-gray-800 hover:bg-[#14161c] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={submit}
                  className="text-sm px-4 py-2 rounded-lg bg-[#6C63FF] hover:bg-[#5b54e6] transition-colors disabled:opacity-50 disabled:hover:bg-[#6C63FF]"
                >
                  {submitting ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
