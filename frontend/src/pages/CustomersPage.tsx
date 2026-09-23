import { useEffect, useState } from "react";
import { listUsers } from "../api/users";
import { LoadingState, ErrorState, EmptyState } from "../components/States";
import { RelativeTime } from "../utils/RelativeTime";
import type { User } from "../types";

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    listUsers("CUSTOMER")
      .then(setCustomers)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
        <p className="text-sm text-slate-500 mt-1">Everyone who has an account with Badi eSIM Support.</p>
      </div>

      {loading && <LoadingState text="Loading customers…" />}
      {error && !loading && <ErrorState message="Unable to load customers." onRetry={load} />}
      {!loading && !error && customers && customers.length === 0 && <EmptyState message="No customers found." />}

      {!loading && !error && customers && customers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {customers.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-[12.5px] font-semibold flex-shrink-0">
                {initialsOf(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-slate-900 truncate">{c.name}</div>
                <div className="text-[12.5px] text-slate-500 truncate">{c.email}</div>
              </div>
              {c.created_at && (
                <span className="text-[12px] text-slate-400 flex-shrink-0">
                  Joined <RelativeTime iso={c.created_at} />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
