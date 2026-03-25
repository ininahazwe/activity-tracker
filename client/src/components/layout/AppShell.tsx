import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useState } from "react";
import { LogOut } from "lucide-react";
// @ts-ignore
import logo from "@/assets/logo.png";

const NAV_ITEMS = [
  { path: "/dashboard", icon: "📊", label: "Dashboard" },
  { path: "/activities", icon: "📋", label: "Activities" },
  { path: "/activities/new", icon: "✏️", label: "New Activity" },
  { path: "/finance", icon: "💰", label: "Finance" },
  { path: "/users", icon: "👤", label: "Users & Roles" },
];

// ─── SETTINGS MENU (Admin only) ───
const SETTINGS_ITEMS = [
  { path: "/settings/projects", icon: "📁", label: "Projects" },
  { path: "/settings/activity-types", icon: "📋", label: "Activity Types" },
  { path: "/settings/thematic-focus", icon: "🎯", label: "Thematic Focus" },
  { path: "/settings/funders", icon: "💰", label: "Funders" },
  { path: "/settings/target-groups", icon: "👥", label: "Target Groups" },
  { path: "/settings/countries", icon: "🌍", label: "Countries" },
  { path: "/settings/regions", icon: "🗺️", label: "Regions" },
  { path: "/settings/cities", icon: "🏙️", label: "Cities" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const initials = user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  const isAdmin = user?.role === "ADMIN";
  const isManagerOrAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  return (
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 bg-surface border-r border-border flex flex-col p-4 shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-7">
            <div className="w-16 h-20 rounded-xl flex items-center justify-center text-lg">
              <img src={logo} alt="logo" />
            </div>
            <div>
              <h1 className="text-white text-sm font-extrabold">NTENTAN</h1>
              <p className="text-gray-500 text-[10px]">Activity Tracker</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1">
            {/* Main Menu */}
            <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest px-4 mb-3">
              Main Menu
            </p>
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.path;
              // Hide Users & Roles for FIELD agents
              if (item.path === "/users" && !isManagerOrAdmin) return null;

              return (
                  <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all
                  ${active ? "bg-accent/10 text-accent font-bold" : "text-gray-400 hover:bg-card-hover hover:text-white"}`}
                  >
                    <span className="text-base w-6 text-center">{item.icon}</span>
                    {item.label}
                  </button>
              );
            })}

            {/* Settings Section (Admin only) */}
            {isAdmin && (
                <>
                  <div className="my-4 border-t border-border pt-4">
                    <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all
                    ${
                            settingsOpen
                                ? "bg-accent/10 text-accent font-bold"
                                : "text-gray-400 hover:bg-card-hover hover:text-white"
                        }`}
                    >
                      <span className="text-base w-6 text-center">⚙️</span>
                      Settings
                      <span
                          className={`ml-auto text-[10px] transition-transform ${
                              settingsOpen ? "rotate-180" : ""
                          }`}
                      >
                    ▼
                  </span>
                    </button>

                    {/* Settings Submenu */}
                    {settingsOpen && (
                        <div className="mt-2 space-y-0.5 ml-2">
                          {SETTINGS_ITEMS.map((item) => {
                            const active = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[12px] font-medium transition-all
                            ${
                                        active
                                            ? "bg-accent/10 text-accent font-bold"
                                            : "text-gray-400 hover:bg-card-hover hover:text-white"
                                    }`}
                                >
                                  <span className="text-sm w-5 text-center">{item.icon}</span>
                                  {item.label}
                                </button>
                            );
                          })}
                        </div>
                    )}
                  </div>
                </>
            )}
          </nav>

          {/* User card */}
          <div className="border-t border-border pt-3 mt-2">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
                <p className="text-gray-500 text-[10px]">{user?.role}</p>
              </div>

              <button
                  onClick={() => setConfirm(true)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Logout Confirmation Modal */}
          {confirm && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-8 shadow-2xl">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <LogOut className="w-6 h-6" />
                  </div>

                  {/* Title */}
                  <h3 className="text-white font-bold text-lg text-center mb-2">
                    Sign Out?
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400 text-sm text-center mb-6">
                    Are you sure you want to sign out? You'll need to log in again to access your account.
                  </p>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                        onClick={() => setConfirm(false)}
                        className="flex-1 px-4 py-2.5 bg-card-hover border border-border text-gray-400 font-semibold rounded-lg hover:text-white hover:border-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                        onClick={() => { logout(); navigate("/login"); }}
                        className="flex-1 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold rounded-lg hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="px-7 py-3 border-b border-border flex items-center justify-between shrink-0">
            <h2 className="text-white text-lg font-extrabold">
              {[...NAV_ITEMS, ...SETTINGS_ITEMS].find((n) => n.path === location.pathname)?.icon}{" "}
              {[...NAV_ITEMS, ...SETTINGS_ITEMS].find((n) => n.path === location.pathname)?.label ||
                  "Activity Tracker"}
            </h2>
            <div className="flex items-center gap-3">
              <div className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-gray-400">
                📅 {new Date().toLocaleDateString()}
              </div>
            </div>
          </header>

          {/* Page */}
          <div className="flex-1 overflow-auto p-6">{children}</div>
        </main>
      </div>
  );
}