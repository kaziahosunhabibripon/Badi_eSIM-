import { useState } from "react";
import { Routes, Route, Navigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { useIdentity } from "./hooks/useIdentity";
import { RequireIdentity } from "./components/RequireIdentity";
import { ChooseIdentity } from "./pages/ChooseIdentity";
import { TicketListPage } from "./pages/TicketListPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { CustomersPage } from "./pages/CustomersPage";
import { Inbox, ClipboardList, Users, LogOut, Menu, X, Bell } from "lucide-react";

function Mark() {
  return (
    <div className="w-7 h-7 rounded-[7px] bg-indigo-600 flex items-center justify-center flex-shrink-0">
      <span className="text-white text-[13px] font-bold">B</span>
    </div>
  );
}

function NavLink({
  to,
  active,
  icon,
  label,
  onClick,
}: {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13.5px] font-medium transition-colors ${
        active ? "bg-indigo-600/25 text-white" : "text-[#C7CEDD] hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function SidebarContent({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  const { user, clearIdentity } = useIdentity();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const onTickets = location.pathname === "/tickets";
  const assignedToMe = onTickets && searchParams.get("assigned_agent_id") === String(user?.id);
  const isAgent = user?.role === "AGENT";
  const initials = user ? user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "";

  return (
    <div className="flex flex-col h-full bg-navy text-white">
      {onClose && (
        <div className="flex justify-end px-2 pt-2">
          <button type="button" onClick={onClose} className="p-1.5 text-white/60 hover:text-white" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
      )}
      <div className={`px-5 pb-4 ${onClose ? "pt-2" : "pt-6"}`}>
        <div className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[15px] font-bold tracking-tight">Badi eSIM</span>
        </div>
        <div className="text-[10.5px] font-semibold text-[#5B6785] tracking-wider mt-1.5">SUPPORT OPS</div>
      </div>

      <div className="px-5 pt-2 pb-1.5">
        <span className="text-[10.5px] font-semibold text-[#5B6785] tracking-wider">WORKSPACE</span>
      </div>
      <nav className="px-3 space-y-0.5">
        {isAgent ? (
          <>
            <NavLink
              to="/tickets"
              active={onTickets && !assignedToMe}
              onClick={onNavigate}
              icon={<Inbox size={15} className="flex-shrink-0" />}
              label="Inbox"
            />
            <NavLink
              to={`/tickets?assigned_agent_id=${user?.id}`}
              active={assignedToMe}
              onClick={onNavigate}
              icon={<ClipboardList size={15} className="flex-shrink-0" />}
              label="My Tickets"
            />
            <NavLink
              to="/customers"
              active={location.pathname === "/customers"}
              onClick={onNavigate}
              icon={<Users size={15} className="flex-shrink-0" />}
              label="Customers"
            />
          </>
        ) : (
          <NavLink
            to="/tickets"
            active={onTickets}
            onClick={onNavigate}
            icon={<Inbox size={15} className="flex-shrink-0" />}
            label="My Tickets"
          />
        )}
      </nav>

      <div className="flex-1" />

      {user && (
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-t border-navy-rail">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[12.5px] font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate">{user.name}</div>
            <div className="text-[10.5px] text-[#8792AC] truncate">{user.role === "AGENT" ? "Support Agent" : "Customer"}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearIdentity();
              window.location.href = "/choose-identity";
            }}
            className="p-1.5 rounded-md text-[#8792AC] hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Switch identity"
            title="Switch identity"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function pageTitle(pathname: string, isAgent: boolean): string {
  if (pathname === "/customers") return "Customers";
  if (pathname.startsWith("/tickets/")) return "Ticket";
  return isAgent ? "Support Inbox" : "My Tickets";
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, errorMsg } = useIdentity();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = user ? user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "";

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <aside className="hidden md:flex flex-col w-[240px] flex-shrink-0">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-navy/55" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[240px] shadow-xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 md:px-7 h-[52px] bg-white border-b border-slate-200 flex-shrink-0">
          <button
            type="button"
            className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <span className="text-[13px] font-semibold text-slate-900">{pageTitle(location.pathname, user?.role === "AGENT")}</span>
          <span className="flex-1" />

          {user && (
            <>
              <Bell size={17} className="text-slate-400 hidden sm:block" aria-hidden />
              {errorMsg && <span className="text-red-600 text-xs" role="alert">{errorMsg}</span>}
              <div className="hidden sm:flex items-center gap-2 pl-3 ml-1 border-l border-slate-200">
                <div className="w-[26px] h-[26px] rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-semibold">
                  {initials}
                </div>
                <span className="text-[13px] text-slate-600">{user.name}</span>
              </div>
            </>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-5 md:px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useIdentity();

  return (
    <Routes>
      <Route
        path="/choose-identity"
        element={user ? <Navigate to="/tickets" replace /> : <ChooseIdentity />}
      />
      <Route
        path="/tickets"
        element={
          <RequireIdentity>
            <AppShell>
              <TicketListPage />
            </AppShell>
          </RequireIdentity>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <RequireIdentity>
            <AppShell>
              <TicketDetailPage />
            </AppShell>
          </RequireIdentity>
        }
      />
      <Route
        path="/customers"
        element={
          <RequireIdentity>
            {user?.role === "AGENT" ? (
              <AppShell>
                <CustomersPage />
              </AppShell>
            ) : (
              <Navigate to="/tickets" replace />
            )}
          </RequireIdentity>
        }
      />
      <Route path="*" element={<Navigate to="/tickets" replace />} />
    </Routes>
  );
}
