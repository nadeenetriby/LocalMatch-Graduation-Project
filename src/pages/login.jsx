import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertIcon } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/login.module.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (!user) {
        setError('Could not start session. Try again.');
        return;
      }
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <main className={styles.main}>
        <div className={styles.cardWrapper}>
          <div className={styles.card}>
            <h2 className={styles.title}>LOG IN</h2>
            <p className={styles.subtitle}>Welcome back</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && (
                <p className={styles.error} role="alert">
                  <AlertIcon size={16} />
                  <span>{error}</span>
                </p>
              )}
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>Email address</label>
                <input
                  type="email"
                  id="email"
                  className={styles.input}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>Password</label>
                <input
                  type="password"
                  id="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                />
                <div className={styles.forgotPasswordWrapper}>
                  <span className={styles.forgotLink}></span>
                </div>
              </div>

              <button type="submit" className={styles.submitButton} disabled={submitting}>
                {submitting ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  'LOG IN'
                )}
              </button>

              <div className={styles.signupWrapper}>
                <Link to="/signup" className={styles.signupButton}>
                  Need an account? Sign up
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
