import styles from './SkeletonCard.module.css';

export default function SkeletonCard() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.image} />
      <div className={styles.body}>
        <div className={styles.lineShort} />
        <div className={styles.line} />
        <div className={styles.linePrice} />
      </div>
    </div>
  );
}
