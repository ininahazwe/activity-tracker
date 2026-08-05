import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import AppShell from "./components/layout/AppShell";

// Chargées immédiatement : ce sont les points d'entrée de l'application
import LoginPage from "./pages/LoginPage";
import AcceptInvitationPage from "./pages/Acceptinvitationpage.tsx";

// Chargées à la demande, une fois la route atteinte
const DashboardPage   = lazy(() => import("./pages/DashboardPage"));
const ActivitiesPage  = lazy(() => import("./pages/ActivitiesPage"));
const NewActivityPage = lazy(() => import("./pages/NewActivityPage"));
const UsersPage       = lazy(() => import("./pages/UsersPage"));
const FinancePage     = lazy(() => import("./pages/FinancePage"));

// Settings : réservées aux admins, regroupées dans un chunk séparé
const ActivityTypesPage = lazy(() => import("./pages/SettingsPages").then((m) => ({ default: m.ActivityTypesPage })));
const ThematicFocusPage = lazy(() => import("./pages/SettingsPages").then((m) => ({ default: m.ThematicFocusPage })));
const FundersPage       = lazy(() => import("./pages/SettingsPages").then((m) => ({ default: m.FundersPage })));
const TargetGroupsPage  = lazy(() => import("./pages/SettingsPages").then((m) => ({ default: m.TargetGroupsPage })));
const CountriesPage     = lazy(() => import("./pages/SettingsPages").then((m) => ({ default: m.CountriesPage })));
const RegionsPage       = lazy(() => import("./pages/SettingsPages").then((m) => ({ default: m.RegionsPage })));
const CitiesPage        = lazy(() => import("./pages/SettingsPages").then((m) => ({ default: m.CitiesPage })));
const ProgrammesPage    = lazy(() => import("./pages/SettingsPages").then((m) => ({ default: m.ProgrammesPage })));
const ProjectsPage      = lazy(() => import("./pages/SettingsPages").then((m) => ({ default: m.ProjectsPage })));

function PageFallback() {
    return (
        <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
    );
}

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
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <AppShell>
                            <Suspense fallback={<PageFallback />}>
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
                                    path="/settings/programmes"
                                    element={
                                        <AdminRoute>
                                            <ProgrammesPage />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="/settings/projects"
                                    element={
                                        <AdminRoute>
                                            <ProjectsPage />
                                        </AdminRoute>
                                    }
                                />
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
                            </Suspense>
                        </AppShell>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}