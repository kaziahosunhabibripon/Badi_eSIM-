import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getDemoUsers } from "../api/users";
import { useIdentity } from "../hooks/useIdentity";
import { LoadingState, ErrorState, EmptyState } from "../components/States";
import { Button } from "../components/ui/Button";
import type { User } from "../types";

export function ChooseIdentity() {
  const navigate = useNavigate();
  const { selectIdentity } = useIdentity();
  const [users, setUsers] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadUsers = useCallback(async () => {
    const reqId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getDemoUsers();
      if (reqId !== requestRef.current) return;
      setUsers(data);
    } catch (e) {
      if (reqId !== requestRef.current) return;
      const msg =
        e && typeof e === "object" && "status" in e && (e as { status: number }).status === 404
          ? "No demo accounts are available. Ask an administrator for your user id and set VITE_MANUAL_USER_ID."
          : "Unable to load users.";
      setError(msg);
    } finally {
      if (reqId === requestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSelect = (user: User) => {
    selectIdentity(user);
    navigate("/tickets");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(manualId, 10);
    if (isNaN(id) || id <= 0) {
      setManualError("Enter a valid user id.");
      return;
    }
    handleSelect({
      id,
      email: "",
      name: `User ${id}`,
      role: "CUSTOMER",
      created_at: "",
    });
  };

  const agents = users ? users.filter((u) => u.role === "AGENT") : [];
  const customers = users ? users.filter((u) => u.role === "CUSTOMER") : [];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 sm:p-6">
    <div className="flex w-full h-full sm:h-auto sm:max-h-[860px] sm:max-w-[980px] bg-white sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-sm overflow-hidden">
      <div className="hidden lg:flex flex-col justify-between w-[320px] flex-shrink-0 bg-navy text-white p-8 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[280px] h-[280px] rounded-full bg-navy-subtle/70" />
        <div className="absolute bottom-[-100px] right-[-60px] w-[220px] h-[220px] rounded-full bg-[#101828]/80" />

        <div className="relative flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-[15px] font-bold">B</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-white text-[15px] tracking-tight">Badi eSIM</span>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-2xl font-bold leading-tight mb-3">Support, handled.</h2>
          <p className="text-[#9AA6C3] text-sm leading-relaxed">
            One workspace for every customer conversation, ticket and eSIM order.
          </p>
        </div>

        <p className="relative text-xs text-[#5B6785]">© Badi eSIM · Digital Cloud Communications</p>
      </div>

      <div className="flex-1 flex flex-col px-6 py-10 sm:px-10 sm:py-10 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-[15px] font-bold">B</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">Badi eSIM Support</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 text-center lg:text-left">Choose your identity</h1>
          <p className="text-sm text-slate-500 mb-8 text-center lg:text-left">
            This is a demo identity picker — no password or token is involved.
          </p>

          {loading && <LoadingState text="Loading users..." />}
          {error && !loading && <ErrorState message={error} onRetry={loadUsers} />}
          {!loading && !error && users && users.length === 0 && (
            <EmptyState message="No users found." />
          )}

          {!loading && !error && users && users.length > 0 && (
            <>
              <section className="mb-8">
                <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Agents</h2>
                <div className="flex flex-col gap-2">
                  {agents.map((u) => (
                    <Button key={u.id} variant="secondary" className="justify-between w-full text-left h-auto py-2.5" onClick={() => handleSelect(u)}>
                      <span className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {u.name.charAt(0)}
                        </span>
                        <span className="flex flex-col leading-tight">
                          <span className="font-medium text-slate-900">{u.name}</span>
                          <span className="text-xs text-slate-500">{u.email}</span>
                        </span>
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 flex-shrink-0">Agent</span>
                    </Button>
                  ))}
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Customers</h2>
                <div className="flex flex-col gap-2">
                  {customers.map((u) => (
                    <Button key={u.id} variant="secondary" className="justify-between w-full text-left h-auto py-2.5" onClick={() => handleSelect(u)}>
                      <span className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {u.name.charAt(0)}
                        </span>
                        <span className="flex flex-col leading-tight">
                          <span className="font-medium text-slate-900">{u.name}</span>
                          <span className="text-xs text-slate-500">{u.email}</span>
                        </span>
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 flex-shrink-0">Customer</span>
                    </Button>
                  ))}
                </div>
              </section>
            </>
          )}

          {error?.includes("No demo accounts") && (
            <form onSubmit={handleManualSubmit} className="border-t border-slate-200 pt-6">
              <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Manual</h2>
              <div className="mb-4">
                <label htmlFor="manual-user-id" className="block text-sm font-medium text-slate-700 mb-1">
                  User id <span className="text-red-500">*</span>
                </label>
                <input
                  id="manual-user-id"
                  type="number"
                  value={manualId}
                  onChange={(e) => { setManualId(e.target.value); setManualError(null); }}
                  placeholder="Enter a user id"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600"
                />
                {manualError && <p className="mt-1 text-sm text-red-600">{manualError}</p>}
              </div>
              <Button type="submit" variant="primary" className="w-full">Continue with this id</Button>
            </form>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
