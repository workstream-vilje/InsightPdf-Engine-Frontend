import ProtectedRoute from "@/components/auth/ProtectedRoute";
import HistoryScreen from "@/features/history/components/History/History";

export const metadata = {
  title: "History | Vilje Rag Canvas",
  description: "Review past configuration combinations, performance metrics, and technical reports in the Vilje Rag Canvas history log.",
};

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryScreen />
    </ProtectedRoute>
  );
}
