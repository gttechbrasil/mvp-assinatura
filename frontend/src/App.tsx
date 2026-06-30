import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./components/Login.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { AdminRoute } from "./components/AdminRoute.js";
import { GroupListPage } from "./pages/GroupListPage.js";
import { MyGroupsPage } from "./pages/MyGroupsPage.js";
import { ServiceSelectorPage } from "./pages/ServiceSelectorPage.js";
import { GroupFormPage } from "./pages/GroupFormPage.js";
import { GroupDetailPage } from "./pages/GroupDetailPage.js";
import { JoinGroupPage } from "./pages/JoinGroupPage.js";
import { ProfilePage } from "./pages/ProfilePage.js";
import { CreditsPage } from "./pages/CreditsPage.js";
import { AdminPage } from "./pages/AdminPage.js";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to /groups */}
        <Route path="/" element={<Navigate to="/groups" replace />} />

        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/join/:token" element={<JoinGroupPage />} />

        {/* Protected */}
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <GroupListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-groups"
          element={
            <ProtectedRoute>
              <MyGroupsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/new"
          element={
            <ProtectedRoute>
              <ServiceSelectorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/new/form"
          element={
            <ProtectedRoute>
              <GroupFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:id"
          element={
            <ProtectedRoute>
              <GroupDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:id/edit"
          element={
            <ProtectedRoute>
              <GroupFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/credits"
          element={
            <ProtectedRoute>
              <CreditsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/groups" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
