import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import LoginPage from "./pages/LoginPage";
import AppShell from "./components/layout/AppShell";
import DashboardPage from "./pages/DashboardPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import NewActivityPage from "./pages/NewActivityPage";
import UsersPage from "./pages/UsersPage";
import FinancePage from "./pages/FinancePage";
import {
    ActivityTypesPage,
    ThematicFocusPage,
    FundersPage,
    TargetGroupsPage,
    CountriesPage,
    RegionsPage,
    CitiesPage,
} from "./pages/SettingsPages";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const user = useAuthStore((s) => s.user);
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <AppShell>
                            <Routes>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<DashboardPage />} />
                                <Route path="/activities" element={<ActivitiesPage />} />
                                <Route path="/activities/new" element={<NewActivityPage />} />
                                <Route path="/activities/edit/:id" element={<NewActivityPage />} />
                                <Route path="/users" element={<UsersPage />} />
                                <Route path="/finance" element={<FinancePage />} />

                                {/* Settings Routes (Admin only) */}
                                <Route
                                    path="/settings/activity-types"
                                    element={
                                        <AdminRoute>
                                            <ActivityTypesPage />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="/settings/thematic-focus"
                                    element={
                                        <AdminRoute>
                                            <ThematicFocusPage />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="/settings/funders"
                                    element={
                                        <AdminRoute>
                                            <FundersPage />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="/settings/target-groups"
                                    element={
                                        <AdminRoute>
                                            <TargetGroupsPage />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="/settings/countries"
                                    element={
                                        <AdminRoute>
                                            <CountriesPage />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="/settings/regions"
                                    element={
                                        <AdminRoute>
                                            <RegionsPage />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="/settings/cities"
                                    element={
                                        <AdminRoute>
                                            <CitiesPage />
                                        </AdminRoute>
                                    }
                                />
                            </Routes>
                        </AppShell>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}