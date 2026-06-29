import { Link } from 'react-router-dom';
import styles from './EmptyState.module.css';

function EmptyIllustration() {
  return (
    <svg
      className={styles.illustration}
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="28" cy="28" r="16" stroke="currentColor" strokeWidth="2" />
      <line x1="40" y1="40" x2="52" y2="52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 28h8M28 24v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function EmptyState({ headline, sub, cta, ctaHref }) {
  return (
    <div className={styles.container}>
      <EmptyIllustration />
      <h2 className={styles.headline}>{headline}</h2>
      {sub && <p className={styles.sub}>{sub}</p>}
      {cta && ctaHref && (
        <Link to={ctaHref} className={styles.cta}>
          {cta}
        </Link>
      )}
    </div>
  );
}
