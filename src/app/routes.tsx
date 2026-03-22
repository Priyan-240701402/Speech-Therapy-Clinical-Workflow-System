import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import Home from "./pages/Home";
import Patients from "./pages/Patients";
import TherapyPlans from "./pages/TherapyPlans";
import Sessions from "./pages/Sessions";
import Reports from "./pages/Reports";
import Feedback from "./pages/Feedback";
import Login from "./pages/Login";
import { ProtectedRoute, RequireRole } from "./auth/ProtectedRoute";

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: Home },
      { path: "patients", Component: Patients },
      { path: "therapy-plans", Component: TherapyPlans },
      { path: "sessions", Component: Sessions },
      {
        path: "reports",
        Component: () => (
          <RequireRole allowed={["supervisor", "therapist", "admin"]}>
            <Reports />
          </RequireRole>
        ),
      },
      {
        path: "feedback",
        Component: () => (
          <RequireRole allowed={["supervisor", "therapist", "admin"]}>
            <Feedback />
          </RequireRole>
        ),
      },
    ],
  },
]);
