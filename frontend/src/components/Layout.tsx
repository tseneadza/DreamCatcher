import { NavLink, Outlet } from 'react-router-dom';
import { Moon, Target, Lightbulb, BedDouble, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dreams', icon: Moon, label: 'Dreams' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/ideas', icon: Lightbulb, label: 'Ideas' },
  { to: '/sleep', icon: BedDouble, label: 'Sleep' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 rounded-lg text-white"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 transform transition-transform lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Moon className="w-6 h-6 text-indigo-300" />
            </div>
            <span className="text-xl font-bold text-white">DreamCatcher</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-500/20 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-3 px-4 py-2 text-white/80">
              <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.name?.[0] || user?.email?.[0] || 'U'}
                </span>
              </div>
              <span className="text-sm truncate flex-1">{user?.name || user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 w-full text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-0 p-4 lg:p-8 pt-16 lg:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
