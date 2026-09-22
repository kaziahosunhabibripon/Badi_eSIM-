import { Routes, Route, Navigate } from "react-router-dom";
import { useIdentity } from "./hooks/useIdentity";
import { RequireIdentity } from "./components/RequireIdentity";
import { ChooseIdentity } from "./pages/ChooseIdentity";
import { TicketListPage } from "./pages/TicketListPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { CreateTicketPage } from "./pages/CreateTicketPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/choose-identity" element={<ChooseIdentity />} />
      <Route
        path="/tickets"
        element={
          <RequireIdentity>
            <TicketListPage />
          </RequireIdentity>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <RequireIdentity>
            <CreateTicketPage />
          </RequireIdentity>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <RequireIdentity>
            <TicketDetailPage />
          </RequireIdentity>
        }
      />
      <Route path="*" element={<Navigate to="/tickets" replace />} />
    </Routes>
  );
}

export default function App() {
  const { user, errorMsg, setErrorMsg } = useIdentity();

  return (
    <>
      {user && (
        <header className="app-header">
          <span className="app-name">Badi eSIM Support</span>
          <span className="spacer" />
          <span>{user.name}</span>
          <span className="badge badge-open">{user.role}</span>
          <a href="/choose-identity" className="btn" onClick={(e) => { e.preventDefault(); setErrorMsg(null); }}>
            Switch identity
          </a>
          {errorMsg && (
            <span className="form-error" role="alert">
              {errorMsg}
            </span>
          )}
        </header>
      )}
      <div className="app-body">
        <AppRoutes />
      </div>
    </>
  );
}
