import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Radio, Package, ShoppingCart,
  Calendar, Users, LogOut, ChevronRight, Tag,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
  { to: "/",            label: "Dashboard",  icon: LayoutDashboard },
  { to: "/stream",      label: "Stream",     icon: Radio           },
  { to: "/products",    label: "Products",   icon: Package         },
  { to: "/categories",  label: "Categories", icon: Tag             },
  { to: "/orders",      label: "Orders",     icon: ShoppingCart    },
  { to: "/events",      label: "Events",     icon: Calendar        },
  { to: "/users",       label: "Users",      icon: Users           },
];

export default function Sidebar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
            <span className="text-white font-display text-sm">F1</span>
          </div>
          <div>
            <p className="text-white font-display text-lg leading-none tracking-wide">F1 AIR</p>
            <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
               ${isActive
                 ? "bg-brand/10 text-brand border border-brand/20"
                 : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
               }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? "text-brand" : "text-zinc-500 group-hover:text-zinc-300"} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={12} className="text-brand" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/50 mb-2">
          <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center">
            <span className="text-brand text-xs font-bold">
              {admin?.firstName?.[0]}{admin?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-100 text-xs font-semibold truncate">
              {admin?.firstName} {admin?.lastName}
            </p>
            <p className="text-zinc-500 text-xs truncate">{admin?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                     text-zinc-400 hover:text-red-400 hover:bg-red-500/10
                     transition-all duration-150 font-medium"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
