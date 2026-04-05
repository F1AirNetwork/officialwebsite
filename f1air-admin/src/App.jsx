import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Spinner from "./components/ui/Spinner.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Stream from "./pages/Stream.jsx";
import Products from "./pages/Products.jsx";
import Categories from "./pages/Categories.jsx";
import Orders from "./pages/Orders.jsx";
import Events from "./pages/Events.jsx";
import Users from "./pages/Users.jsx";

// ─── Protected layout wrapper ─────────────────
function AdminLayout() {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size={36} />
      </div>
    );
  }

  if (!admin) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 ml-60 p-8 overflow-y-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

// ─── Redirect to dashboard if already logged in ─
function PublicRoute() {
  const { admin, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Spinner size={36} /></div>;
  return admin ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Protected admin layout */}
          <Route element={<AdminLayout />}>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/stream"     element={<Stream />} />
            <Route path="/products"   element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/orders"     element={<Orders />} />
            <Route path="/events"     element={<Events />} />
            <Route path="/users"      element={<Users />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
