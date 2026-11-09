import { useAuth } from '../context/AuthContext.jsx';

export default function UserBar({ onLogin }) {
  const { user, logout } = useAuth();
  if (!user) return <button onClick={onLogin}>Login / Register</button>;
  return (
    <>
      <span className="note">PLAYER: {user.username}</span>
      <button onClick={logout}>Logout</button>
    </>
  );
}
