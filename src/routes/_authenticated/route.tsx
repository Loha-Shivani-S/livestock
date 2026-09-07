import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});
