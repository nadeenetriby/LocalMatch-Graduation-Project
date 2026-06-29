import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.layout}>
      <div className={styles.marquee}>
        <p>NEW DROPS WEEKLY • SUPPORT LOCAL BRANDS • DISCOVER INDEPENDENT DESIGNERS •</p>
      </div>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
