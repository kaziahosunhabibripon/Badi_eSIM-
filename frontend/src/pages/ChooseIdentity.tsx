import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getDemoUsers } from "../api/users";
import { useIdentity } from "../hooks/useIdentity";
import { LoadingState } from "../components/States";
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
    // Use a temporary user object - it will be validated by the API
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
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1>Choose your identity</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
        This is a demo identity picker standing in for login, because authentication is out of scope for this assignment.
        No password or token is involved.
      </p>

      {loading && <LoadingState text="Loading users..." />}
      {error && !loading && (
        <div className="state error">
          <p>{error}</p>
          <button type="button" className="btn" onClick={loadUsers} style={{ marginTop: 12 }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && users && users.length === 0 && (
        <div className="state empty">
          <p>{error ?? "No users found."}</p>
        </div>
      )}

      {!loading && !error && users && users.length > 0 && (
        <>
          <section aria-label="Agents">
            <h2>Agents</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {agents.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="btn"
                  style={{ textAlign: "left", display: "flex", justifyContent: "space-between" }}
                  onClick={() => handleSelect(u)}
                >
                  <span>
                    <strong>{u.name}</strong>
                    <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: 13 }}>
                      {u.email}
                    </span>
                  </span>
                  <span className="badge badge-open">Agent</span>
                </button>
              ))}
            </div>
          </section>

          <section aria-label="Customers">
            <h2>Customers</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {customers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="btn"
                  style={{ textAlign: "left", display: "flex", justifyContent: "space-between" }}
                  onClick={() => handleSelect(u)}
                >
                  <span>
                    <strong>{u.name}</strong>
                    <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: 13 }}>
                      {u.email}
                    </span>
                  </span>
                  <span className="badge badge-closed">Customer</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {error?.includes("No demo accounts") && (
        <form onSubmit={handleManualSubmit} style={{ marginTop: 16 }}>
          <div className="form-group">
            <label htmlFor="manual-user-id">User id (dev only)</label>
            <input
              id="manual-user-id"
              type="number"
              value={manualId}
              onChange={(e) => { setManualId(e.target.value); setManualError(null); }}
              placeholder="Enter a user id"
            />
            {manualError && <div className="form-error">{manualError}</div>}
          </div>
          <button type="submit" className="btn btn-primary">
            Continue with this id
          </button>
        </form>
      )}
    </div>
  );
}
