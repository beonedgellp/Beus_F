import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Chat from './pages/Chat';
import Collective from './pages/Collective';
import Personal from './pages/Personal';
import Profile from './pages/Profile';
import Groups from './pages/Groups';
import GroupView from './pages/GroupView';
import Shared from './pages/Shared';
import Layout from './components/Layout';

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Public shared-file download page */}
      <Route path="/shared/:token" element={<Shared />} />

      <Route
        path="/login"
        element={
          loading ? (
            <div className="center-screen">Loading…</div>
          ) : user ? (
            <Navigate to={user.mustChangePassword ? '/change-password' : '/chat'} replace />
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/change-password"
        element={
          loading ? (
            <div className="center-screen">Loading…</div>
          ) : !user ? (
            <Navigate to="/login" replace />
          ) : (
            <ChangePassword />
          )
        }
      />

      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/chat" element={<Chat />} />
        <Route path="/collective" element={<Collective />} />
        <Route path="/personal" element={<Personal />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupView />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
