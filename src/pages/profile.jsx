import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CommunitySection from '../components/CommunitySection/CommunitySection';
import styles from '../styles/profile.module.css';

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <main className={styles.main}>
          <p className={styles.loading}>Loading...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Member';

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className={styles.pageWrapper}>
      <main className={styles.main}>
        <div className={styles.cardWrapper}>
          <div className={styles.card}>
            <span className={styles.badge}>Profile</span>

            <h1 className={styles.title}>{displayName}</h1>

            <p className={styles.email}>{user.email}</p>

            {user.role === 'admin' && (
              <p className={styles.role}>Administrator</p>
            )}

            <div className={styles.actions}>
              <Link
                to="/favorites"
                className={styles.secondaryBtn}
              >
                View Favorites
              </Link>

              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={styles.secondaryBtn}
                >
                  Admin Dashboard
                </Link>
              )}

              <button
                type="button"
                className={styles.logoutBtn}
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </main>

      <CommunitySection />
    </div>
  );
}