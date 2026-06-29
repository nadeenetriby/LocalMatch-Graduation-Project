import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerBrand}>
          <div className={styles.footerLogo}>LOCAL MATCH</div>
          <p>The definitive platform for discovering local talent and independent clothing brands.</p>
          <small>© Local Match</small>
        </div>
        <div className={styles.footerLinks}>
          <div className={styles.linkColumn}>
            <h4>EXPLORE</h4>
            <Link to="/brands">Brands</Link>
            <Link to="/favorites">Favorites</Link>
          </div>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <span>© Local Match</span>
        <div className={styles.legalLinks}>
          <a href="#privacy">PRIVACY POLICY</a>
          <a href="#terms">TERMS OF SERVICE</a>
        </div>
      </div>
    </footer>
  );
}
