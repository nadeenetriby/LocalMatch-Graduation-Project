import SkeletonCard from './SkeletonCard';
import styles from './LoadingState.module.css';

export default function LoadingState({ count = 8 }) {
  return (
    <div className={styles.grid} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
