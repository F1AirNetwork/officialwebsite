import { NavLink, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext.jsx";

const Navbar = () => {
  const { user, logout }          = useAuth();
  const navigate                  = useNavigate();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [dropOpen, setDropOpen]   = useState(false);
  const dropRef                   = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setDropOpen(false);
    await logout();
    navigate("/");
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  const hasActiveSub = user?.subscription?.status === "active";

  return (
    <nav className="fixed top-0 left-0 z-50 w-full transition-colors duration-300 bg-transparent">

      {/* Background blur on scroll */}
      <div className={`absolute inset-0 transition-opacity duration-300
        ${scrolled ? "opacity-100 bg-black/40 backdrop-blur-md" : "opacity-0"}`} />

      {/* Bottom border */}
      <div className={`absolute bottom-0 left-0 right-0 h-px bg-white/10 transition-opacity duration-300
        ${scrolled ? "opacity-100" : "opacity-0"}`} />

      {/* Content */}
      <div className="relative flex items-center justify-between h-20 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">

        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3">
          <img src={logo} alt="F1 Air Network" className="w-auto h-8 sm:h-9 md:h-10" />
          <span className="hidden text-sm tracking-widest uppercase sm:block font-f1">
            F1 AIR NETWORK
          </span>
        </NavLink>

        {/* Desktop nav */}
        <div className="items-center hidden gap-8 text-sm uppercase lg:flex font-f1">
          <NavLink onClick={() => window.scrollTo(0, 0)} className="transition-transform duration-300 hover:scale-110" to="/">Home</NavLink>
          <NavLink onClick={() => window.scrollTo(0, 0)} className="transition-transform duration-300 hover:scale-110" to="/store">Store</NavLink>
          <NavLink onClick={() => window.scrollTo(0, 0)} className="transition-transform duration-300 hover:scale-110" to="/livestream">Livestream</NavLink>
          <NavLink onClick={() => window.scrollTo(0, 0)} className="transition-transform duration-300 hover:scale-110" to="/about">About</NavLink>
          <NavLink onClick={() => window.scrollTo(0, 0)} className="transition-transform duration-300 hover:scale-110" to="/contact">Contact</NavLink>

          {user ? (
            /* ── Logged-in user dropdown ── */
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 transition border rounded-lg border-white/20 hover:border-white/50"
              >
                {/* Avatar */}
                <span className="flex items-center justify-center text-xs font-bold rounded-full w-7 h-7 bg-white/10">
                  {initials}
                </span>
                <span className="text-sm font-f1_n">{user.firstName}</span>
                {hasActiveSub && (
                  <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Pro
                  </span>
                )}
                <svg className={`w-3 h-3 transition-transform ${dropOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropOpen && (
                <div className="absolute right-0 mt-2 overflow-hidden border shadow-2xl w-52 bg-black/90 backdrop-blur-md border-white/10 rounded-xl">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-semibold text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs truncate text-white/40">{user.email}</p>
                    {hasActiveSub && (
                      <p className="mt-1 text-xs tracking-wider text-red-400 uppercase">
                        ● {user.subscription.productName ?? "Active Subscription"}
                      </p>
                    )}
                  </div>

                  {/* Links */}
                  <div className="py-1">
                    <Link
                      to="/livestream"
                      onClick={() => setDropOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
                    >
                      <span>📺</span> Watch Live
                    </Link>
                    <Link
                      to="/store"
                      onClick={() => setDropOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
                    >
                      <span>🛒</span> Store
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="py-1 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                    >
                      <span>→</span> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Guest login button ── */
            <Link to="/login" className="px-5 py-2 transition-all duration-300 border border-white/50 hover:bg-gray-500 hover:text-black">
              Login
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="text-2xl lg:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t lg:hidden bg-black/90 backdrop-blur-md border-white/10">
          <div className="flex flex-col items-center gap-6 py-8 text-sm uppercase font-f1">
            <NavLink onClick={() => setMenuOpen(false)} to="/">Home</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/store">Store</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/livestream">Livestream</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/about">About</NavLink>
            <NavLink onClick={() => setMenuOpen(false)} to="/contact">Contact</NavLink>

            {user ? (
              <>
                <p className="text-xs text-white/50">{user.firstName} {user.lastName}</p>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 text-red-400 transition border rounded border-red-500/50 hover:bg-red-500/10"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                onClick={() => setMenuOpen(false)}
                to="/login"
                className="px-6 py-3 transition border border-white/70 hover:bg-white hover:text-black"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;