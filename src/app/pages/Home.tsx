import { useAuth, useRole } from "../auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Users, Clock, FileText, Bell } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

type DashboardStats = {
  activePatients: number;
  pendingApprovals: number;
  reportsDue: number;
};

type ActivityItem = {
  id: number;
  message: string;
  createdAt: string;
};

type NotificationItem = {
  id: number;
  type: string;
  message: string;
  createdAt: string;
};

export default function Home() {
  const { token, user } = useAuth();
  const role = useRole();
  const [stats, setStats] = useState<DashboardStats>({
    activePatients: 0,
    pendingApprovals: 0,
    reportsDue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!active) return;
        setStats({
          activePatients: data?.stats?.activePatients ?? 0,
          pendingApprovals: data?.stats?.pendingApprovals ?? 0,
          reportsDue: data?.stats?.reportsDue ?? 0,
        });
        setRecentActivity(data?.recentActivity ?? []);
        setNotifications(data?.notifications ?? []);
      } catch {
        if (!active) return;
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, [token]);

  const statsData = useMemo(
    () => [
      {
        title: "Active Patients",
        value: String(stats.activePatients),
        icon: Users,
        color: "bg-blue-500",
        change: loading ? "Loading..." : "Updated from live data",
      },
      {
        title: "Pending Approvals",
        value: String(stats.pendingApprovals),
        icon: Clock,
        color: "bg-yellow-500",
        change: role === "supervisor" || role === "admin" ? "Awaiting review" : "Pending items",
      },
      {
        title: "Reports Due",
        value: String(stats.reportsDue),
        icon: FileText,
        color: "bg-red-500",
        change: "Due this week",
      },
    ],
    [stats, role, loading]
  );

  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Just now";
    }
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Welcome back!</h2>
        <p className="text-gray-600 mt-1">
          You're logged in as{" "}
          <span className="font-medium">
            {user?.displayName || user?.username || role}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statsData.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">{stat.title}</p>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.change}</p>
                      </div>
                      <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 && !loading ? (
                  <p className="text-sm text-gray-500">No recent activity yet.</p>
                ) : (
                  recentActivity.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 ${
                        index < recentActivity.length - 1 ? "pb-3 border-b" : ""
                      }`}
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm">{item.message}</p>
                        <p className="text-xs text-gray-500">{formatTime(item.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div>
                    <p className="font-medium text-gray-900">Sarah Johnson</p>
                    <p className="text-sm text-gray-600">Articulation Therapy</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-600">3:00 PM</p>
                    <Badge variant="outline" className="bg-white">Session 5/10</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div>
                    <p className="font-medium text-gray-900">David Lee</p>
                    <p className="text-sm text-gray-600">Language Development</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-600">4:30 PM</p>
                    <Badge variant="outline" className="bg-white">Session 3/12</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Notifications Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="flex flex-row items-center gap-2">
              <Bell className="w-5 h-5 text-gray-600" />
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${getNotificationColor(notification.type)}`}
                  >
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                ))}
                {notifications.length === 0 && !loading && (
                  <p className="text-sm text-gray-500">No notifications yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
