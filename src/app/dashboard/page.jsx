import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardScreen from "@/features/dashboard/components/Dashboard/Dashboard";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardScreen />
    </ProtectedRoute>
  );
}
