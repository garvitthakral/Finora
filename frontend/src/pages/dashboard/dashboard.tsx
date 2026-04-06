import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar, { type DashboardSection } from "./components/sidebar";
import DashboardContent from "./components/body";
import { useAuth } from "../../context/useAuth";

type CategoryBreakdown = { category: string; total: number };
type Transaction = {
  id: string;
  amount: number;
  category: string;
  type: "INCOME" | "EXPENSE";
  transactionDate: string;
};
type MonthlyTrend = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};
type BalanceSummary = { income: number; expense: number; overAllBalance: number };

type DashboardData = {
  categoryBreakdown: CategoryBreakdown[];
  recentTransactions: Transaction[];
  monthlyTrend: MonthlyTrend[];
  netBalance: BalanceSummary;
  currMonthBalance: BalanceSummary;
};

type DashboardApiResponse =
  | { success: true; message: string; data: DashboardData }
  | { netBalance: BalanceSummary; currMonthBalance: BalanceSummary };

function getInitialSection(pathname: string): DashboardSection {
  if (pathname === "/users") return "users";
  return "dashboard";
}

const Dashboard = () => {
  const { user, authLogout, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";

  const [activeSection, setActiveSection] = useState<DashboardSection>(() =>
    getInitialSection(location.pathname),
  );

  useEffect(() => {
    const next = getInitialSection(location.pathname);
    setActiveSection(next === "users" && !isAdmin ? "dashboard" : next);
  }, [location.pathname, isAdmin]);

  useEffect(() => {
    if (!isAdmin && activeSection === "users") setActiveSection("dashboard");
  }, [activeSection, isAdmin]);

  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFromInput(params.get("from") ?? "");
    setToInput(params.get("to") ?? "");
  }, [location.search]);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(location.search);
    const from = params.get("from") ?? undefined;
    const to = params.get("to") ?? undefined;

    const fetchDashboard = async () => {
      if (!token) return;
      setLoadingDashboard(true);
      setDashboardError(null);

      try {
        const dashboardUrl =
          import.meta.env.VITE_STATS_DASHBOARD_URL ||
          `${import.meta.env.VITE_API_BASE_URL}/api/stats/dashboard`;

        const res = await axios.get<DashboardApiResponse>(dashboardUrl, {
          headers: { Authorization: `Bearer ${token}` },
          params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
        });

        if (cancelled) return;

        const payload = res.data as DashboardApiResponse;
        const data: DashboardData =
          "data" in payload
            ? payload.data
            : {
                categoryBreakdown: [],
                recentTransactions: [],
                monthlyTrend: [],
                netBalance: payload.netBalance,
                currMonthBalance: payload.currMonthBalance,
              };

        setDashboardData(data);
      } catch (e) {
        if (!cancelled) {
          const message =
            e instanceof Error ? e.message : "Failed to load dashboard";
          setDashboardError(message);
        }
      } finally {
        if (!cancelled) setLoadingDashboard(false);
      }
    };

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [token, location.search]);

  const navItems = useMemo(() => {
    const items: { id: DashboardSection; label: string }[] = [
      { id: "dashboard", label: "Dashboard" },
    ];
    if (isAdmin) items.push({ id: "users", label: "Users" });
    return items;
  }, [isAdmin]);

  return (
    <div className="flex h-screen bg-[#1C1F2A] text-white">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        items={navItems}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="px-6 py-4 border-b border-gray-800 bg-[#1C1F2A]/80 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {activeSection === "dashboard" ? "Overview" : "Users"}
              </h2>
              <p className="text-sm text-gray-400">
                {activeSection === "dashboard"
                  ? "Your finances at a glance."
                  : "Manage access and permissions."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeSection === "dashboard" && (
                <div className="hidden lg:flex items-center gap-2 rounded-xl bg-[#16181F] border border-gray-800 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400" htmlFor="fromDate">
                      From
                    </label>
                    <input
                      id="fromDate"
                      type="date"
                      value={fromInput}
                      onChange={(e) => setFromInput(e.target.value)}
                      className="bg-transparent text-sm text-gray-200 outline-none border border-gray-800 rounded-lg px-2 py-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400" htmlFor="toDate">
                      To
                    </label>
                    <input
                      id="toDate"
                      type="date"
                      value={toInput}
                      onChange={(e) => setToInput(e.target.value)}
                      className="bg-transparent text-sm text-gray-200 outline-none border border-gray-800 rounded-lg px-2 py-1"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams(location.search);
                      if (fromInput) params.set("from", fromInput);
                      else params.delete("from");
                      if (toInput) params.set("to", toInput);
                      else params.delete("to");
                      const nextSearch = params.toString();
                      navigate(
                        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
                        { replace: true },
                      );
                    }}
                    className="text-sm px-3 py-1.5 rounded-lg bg-[#6C63FF] hover:bg-[#5b54e6] transition-colors"
                  >
                    Apply
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFromInput("");
                      setToInput("");
                      const params = new URLSearchParams(location.search);
                      params.delete("from");
                      params.delete("to");
                      const nextSearch = params.toString();
                      navigate(
                        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
                        { replace: true },
                      );
                    }}
                    className="text-sm px-3 py-1.5 rounded-lg bg-transparent border border-gray-800 hover:bg-[#14161c] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-2 rounded-full bg-[#16181F] border border-gray-800 px-3 py-1.5">
                <span className="text-xs text-gray-400">Role</span>
                <span className="text-xs font-medium">{user?.role ?? "-"}</span>
              </div>

              <button
                type="button"
                onClick={authLogout}
                className="text-sm px-3 py-2 rounded-lg bg-[#16181F] border border-gray-800 hover:bg-[#14161c] transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {activeSection === "dashboard" ? (
            <DashboardMain
              data={dashboardData}
              loading={loadingDashboard}
              error={dashboardError}
            />
          ) : isAdmin ? (
            <UsersPanel token={token} />
          ) : (
            <DashboardMain
              data={dashboardData}
              loading={loadingDashboard}
              error={dashboardError}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

function DashboardMain({
  data,
  loading,
  error,
}: {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#16181F] p-5 rounded-xl border border-gray-800 animate-pulse"
            >
              <div className="h-4 w-24 bg-[#1C1F2A] rounded" />
              <div className="h-8 w-32 bg-[#1C1F2A] rounded mt-3" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#16181F] p-6 rounded-xl border border-gray-800 animate-pulse"
            >
              <div className="h-4 w-40 bg-[#1C1F2A] rounded mb-4" />
              <div className="h-72 bg-[#1C1F2A] rounded" />
            </div>
          ))}
        </div>
        <div className="bg-[#16181F] p-6 rounded-xl border border-gray-800 animate-pulse">
          <div className="h-4 w-44 bg-[#1C1F2A] rounded mb-4" />
          <div className="h-52 bg-[#1C1F2A] rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#16181F] p-6 rounded-xl border border-gray-800">
        <h3 className="text-lg font-semibold">Couldn’t load dashboard</h3>
        <p className="text-sm text-gray-400 mt-1">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return <DashboardContent {...data} />;
}

type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "ANALYST" | "VIEWER";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type GetUsersResponse = {
  success: true;
  message: string;
  data: {
    users: UserRecord[];
    page: number;
    limit: number;
    totalUsers: number;
    totalPages: number;
  };
};

type ChangeRoleResponse = {
  success: true;
  message: string;
  data: UserRecord;
};

type DeleteUserResponse = {
  success: true;
  message: string;
  data: UserRecord;
};

function UsersPanel({ token }: { token: string | null }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);

  const fetchUsers = useCallback(
    async (opts?: { page?: number }) => {
      if (!token) return;
      setLoading(true);
      setError(null);

      try {
        const getUsersUrl =
          import.meta.env.VITE_GET_USERS_URL ||
          `${import.meta.env.VITE_API_BASE_URL}/api/user/get-users`;

        const res = await axios.get<GetUsersResponse>(getUsersUrl, {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: opts?.page ?? page },
        });

        setUsers(res.data.data.users);
        setTotalPages(res.data.data.totalPages);
        setTotalUsers(res.data.data.totalUsers);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load users";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [token, page],
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;

  return (
    <div className="space-y-6">
      <div className="bg-[#16181F] p-6 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Users</h3>
            <p className="text-sm text-gray-400">
              {loading
                ? "Fetching users…"
                : `Page ${page} of ${totalPages} · ${totalUsers} total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCreateOpen(true);
              }}
              className="text-sm px-3 py-2 rounded-lg bg-[#6C63FF] hover:bg-[#5b54e6] transition-colors"
            >
              Create user
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#16181F] p-6 rounded-xl border border-gray-800">
        {error && (
          <div className="mb-4 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-gray-800">
              <tr>
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Email</th>
                <th className="text-left py-2 pr-4">Role</th>
                <th className="text-left py-2 pr-4">Status</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-3 pr-4">
                      <div className="h-4 w-32 bg-[#1C1F2A] rounded animate-pulse" />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="h-4 w-48 bg-[#1C1F2A] rounded animate-pulse" />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="h-4 w-20 bg-[#1C1F2A] rounded animate-pulse" />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="h-4 w-20 bg-[#1C1F2A] rounded animate-pulse" />
                    </td>
                    <td className="py-3 text-right">
                      <div className="h-8 w-28 bg-[#1C1F2A] rounded animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td className="py-6 text-gray-400" colSpan={5}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/users/${u.id}/transactions`, { state: { user: u } })}
                    className="border-b border-gray-800 hover:bg-[#1f2230] cursor-pointer"
                  >
                    <td className="py-3 pr-4">{u.name}</td>
                    <td className="py-3 pr-4">{u.email}</td>
                    <td className="py-3 pr-4">{u.role}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          u.status === "ACTIVE"
                            ? "text-green-300"
                            : "text-gray-300"
                        }
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingUser(u);
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-800 hover:bg-[#14161c] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingUser(u);
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-red-900/40 text-red-200 hover:bg-red-950/30 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 gap-3">
          <p className="text-xs text-gray-500">
            Showing {users.length} user{users.length === 1 ? "" : "s"} on this
            page
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-sm px-3 py-2 rounded-lg bg-transparent border border-gray-800 hover:bg-[#14161c] transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Prev
            </button>
            <div className="text-sm text-gray-300 px-3 py-2 rounded-lg border border-gray-800">
              {page} / {totalPages}
            </div>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="text-sm px-3 py-2 rounded-lg bg-transparent border border-gray-800 hover:bg-[#14161c] transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {createOpen && (
        <CreateUserModal
          token={token}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            fetchUsers();
          }}
        />
      )}

      {editingUser && (
        <EditUserRoleModal
          token={token}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={(updated) => {
            setUsers((prev) =>
              prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
            );
            setEditingUser(null);
          }}
        />
      )}

      {deletingUser && (
        <DeleteUserConfirmModal
          token={token}
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleted={() => {
            setDeletingUser(null);
            // Refetch to keep pagination/total accurate
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  token,
  onClose,
  onCreated,
}: {
  token: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "ANALYST" | "VIEWER">("VIEWER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !!token &&
    email.trim().length > 0 &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const createUserUrl =
        import.meta.env.VITE_CREATE_USER_URL ||
        `${import.meta.env.VITE_API_BASE_URL}/api/user/create-user`;

      await axios.post(
        createUserUrl,
        {
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      onCreated();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create user";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Create user"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close create user modal"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#0F1117] shadow-2xl">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Create user</h3>
              <p className="text-sm text-gray-400">
                Fill details and invite a new user.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
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
              <Field label="First name" htmlFor="firstName">
                <input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6C63FF]"
                  placeholder="Garvit"
                />
              </Field>
              <Field label="Last name" htmlFor="lastName">
                <input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6C63FF]"
                  placeholder="Thakral"
                />
              </Field>
            </div>

            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6C63FF]"
                placeholder="name@company.com"
              />
            </Field>

            <Field label="Role" htmlFor="role">
              <select
                id="role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "ADMIN" | "ANALYST" | "VIEWER")
                }
                className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6C63FF]"
              >
                <option value="VIEWER">VIEWER</option>
                <option value="ANALYST">ANALYST</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </Field>
          </div>

          <div className="p-5 border-t border-gray-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
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
  );
}

function EditUserRoleModal({
  token,
  user,
  onClose,
  onUpdated,
}: {
  token: string | null;
  user: UserRecord;
  onClose: () => void;
  onUpdated: (updated: UserRecord) => void;
}) {
  const [newRole, setNewRole] = useState<UserRecord["role"]>(user.role);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!token && !submitting && newRole !== user.role;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const baseUrl =
        import.meta.env.VITE_CHANGE_USER_ROLE_URL ||
        `${import.meta.env.VITE_API_BASE_URL}/api/user/change-role`;

      const url = `${baseUrl}/${user.id}`;

      const res = await axios.patch<ChangeRoleResponse>(
        url,
        {
          // Present in ChangeUserRoleReqSchema but unused by handler; include for completeness
          userId: user.id,
          newRole,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      onUpdated(res.data.data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update role";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Edit user role"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close edit role modal"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#0F1117] overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-gray-800">
            <div>
              <h3 className="text-lg font-semibold">Edit role</h3>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
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

            <Field label="Role" htmlFor="editRole">
              <select
                id="editRole"
                value={newRole}
                onChange={(e) =>
                  setNewRole(
                    e.target.value as "ADMIN" | "ANALYST" | "VIEWER",
                  )
                }
                className="w-full bg-[#16181F] border border-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6C63FF]"
              >
                <option value="VIEWER">VIEWER</option>
                <option value="ANALYST">ANALYST</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </Field>
          </div>

          <div className="p-5 border-t border-gray-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
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
              {submitting ? "Updating…" : "Update"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteUserConfirmModal({
  token,
  user,
  onClose,
  onDeleted,
}: {
  token: string | null;
  user: UserRecord;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!token || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const baseUrl =
        import.meta.env.VITE_DELETE_USER_URL ||
        `${import.meta.env.VITE_API_BASE_URL}/api/user/delete-user`;

      const url = `${baseUrl}/${user.id}`;

      await axios.delete<DeleteUserResponse>(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onDeleted();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete user";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Delete user confirmation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close delete user modal"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#0F1117] overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-red-200">Confirm delete</h3>
              <p className="text-sm text-gray-400">
                {user.name} · {user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
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
            <p className="text-sm text-gray-300">
              Are you sure you want to delete this user? This will deactivate their account.
            </p>
          </div>

          <div className="p-5 border-t border-gray-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg bg-transparent border border-gray-800 hover:bg-[#14161c] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={submitting}
              className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {submitting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs text-gray-400">
        {label}
      </label>
      {children}
    </div>
  );
}
