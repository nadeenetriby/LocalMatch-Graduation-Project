import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SearchIcon, UserIcon, HeartIcon, MenuIcon, CloseIcon } from '../icons';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'HOME' },
  { to: '/brands', label: 'BRANDS' },
  { to: '/favorites', label: 'FAVORITES' },
];

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const onAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const navLinkClass = ({ isActive }) =>
    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''} ${searchOpen ? styles.searchExpanded : ''}`}>
        <div className={styles.headerRow}>
          <div className={styles.navLeft}>
            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <MenuIcon />
            </button>
            <Link to="/" className={styles.logo}>LOCAL MATCH</Link>
            <nav className={styles.navLinks} aria-label="Main navigation">
              {NAV_ITEMS.map(({ to, label }) => (
                <NavLink key={to} to={to} className={navLinkClass}>{label}</NavLink>
              ))}
            </nav>
          </div>
          <div className={styles.navRight}>
            <button
              type="button"
              className={styles.searchToggle}
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              aria-expanded={searchOpen}
            >
              <SearchIcon size={18} />
            </button>
            <form onSubmit={handleSearch} className={`${styles.searchBar} ${styles.searchBarDesktop}`}>
              <input
                type="text"
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search for products"
              />
              <button type="submit" aria-label="Search"><SearchIcon size={16} /></button>
            </form>
            {user?.role === 'admin' && !onAdminPage && (
              <Link to="/admin" className={`${styles.navLink} ${styles.adminLink}`}>
                ADMIN
              </Link>
            )}
            <Link to={user ? '/profile' : '/login'} className={styles.iconBtn} aria-label={user ? 'Profile' : 'Log in'}><UserIcon /></Link>
            <Link to="/favorites" className={styles.iconBtn} aria-label="Favorites"><HeartIcon /></Link>
          </div>
        </div>
        <form onSubmit={handleSearch} className={styles.searchBarMobile}>
          <input
            type="text"
            placeholder="Search for products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search for products"
          />
          <button type="submit" aria-label="Search"><SearchIcon size={16} /></button>
        </form>
      </header>

      {menuOpen && (
        <div className={styles.drawerRoot}>
          <button
            type="button"
            className={styles.overlay}
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
          <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Menu</span>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            <nav className={styles.drawerNav}>
              {NAV_ITEMS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={navLinkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
              {user?.role === 'admin' && !onAdminPage && (
                <Link
                  to="/admin"
                  className={styles.navLink}
                  onClick={() => setMenuOpen(false)}
                >
                  ADMIN
                </Link>
              )}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
