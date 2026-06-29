import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertIcon } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/signup.module.css';

function passwordStrength(password) {
  if (!password) return { level: 0, label: '' };
  if (password.length < 6) return { level: 1, label: 'Too short' };
  if (password.length < 10) return { level: 2, label: 'Fair' };
  return { level: 3, label: 'Strong' };
}

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      const user = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
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
      setError(err.message || 'Sign up failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <main className={styles.main}>
        <div className={styles.cardContainer}>
          <div className={styles.cardBody}>
            <h1 className={styles.title}>Join us</h1>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && (
                <p className={styles.error} role="alert">
                  <AlertIcon size={16} />
                  <span>{error}</span>
                </p>
              )}

              <div className={styles.nameRow}>
                <div className={styles.inputGroup}>
                  <label htmlFor="firstName">First name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    className={styles.input}
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="lastName">Last name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    className={styles.input}
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={styles.input}
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
                {formData.password && (
                  <>
                    <div className={styles.strengthBar} aria-hidden="true">
                      <div className={`${styles.strengthSegment} ${strength.level >= 1 ? styles.strengthWeak : ''}`} />
                      <div className={`${styles.strengthSegment} ${strength.level >= 2 ? styles.strengthFair : ''}`} />
                      <div className={`${styles.strengthSegment} ${strength.level >= 3 ? styles.strengthGood : ''}`} />
                    </div>
                    <span className={styles.strengthLabel}>{strength.label}</span>
                  </>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className={styles.input}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
              </div>

              <button type="submit" className={styles.submitButton} disabled={submitting}>
                {submitting ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    Creating…
                  </>
                ) : (
                  'Create account'
                )}
              </button>

              <div className={styles.loginSection}>
                <span className={styles.loginText}>
                  Already have an account?
                  <Link to="/login" className={styles.loginLink}>Log in</Link>
                </span>
              </div>
            </form>

            <p className={styles.disclaimer}>
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
