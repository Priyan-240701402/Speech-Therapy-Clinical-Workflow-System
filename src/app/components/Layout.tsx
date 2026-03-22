import { Outlet, Link, useLocation } from "react-router";
import { Home, Users, FileText, Calendar, BarChart3, MessageSquare, User, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: "Home", path: "/", icon: Home },
    { name: "Patients", path: "/patients", icon: Users },
    { name: "Therapy Plans", path: "/therapy-plans", icon: FileText },
    { name: "Sessions", path: "/sessions", icon: Calendar },
    { name: "Reports", path: "/reports", icon: BarChart3 },
    { name: "Feedback", path: "/feedback", icon: MessageSquare },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const role = user?.role ?? "therapist";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🗣️</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Speech-Language Therapy</h1>
                <p className="text-xs text-gray-500">Clinical Workflow System</p>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 capitalize">{role}</span>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-1 -mb-px">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    active
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
