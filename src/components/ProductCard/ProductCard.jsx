import { Link } from 'react-router-dom';
import { HeartIcon } from '../icons';
import { cn } from '../../utils/classNames';
import styles from './ProductCard.module.css';

export default function ProductCard({
  id,
  brand,
  title,
  name,
  price,
  image,
  isAvailable = true,
  isNew = false,
  isLiked = false,
  onLike,
}) {
  const productTitle = title ?? name ?? '';

  return (
    <article className={styles.card}>
      <div className={styles.imageContainer}>
        <Link to={`/item/${id}`} className={styles.imageLink}>
          <img
            src={image}
            alt={productTitle}
            className={styles.image}
            loading="lazy"
          />
        </Link>
        {onLike && (
          <button
            type="button"
            className={cn(styles.likeButton, isLiked && styles.liked)}
            onClick={onLike}
            aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
          >
            <HeartIcon size={20} filled={isLiked} />
          </button>
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.brand}>{brand}</span>
          {isNew && <span className={styles.newBadge}>NEW DROP</span>}
        </div>
        <Link to={`/item/${id}`} className={styles.titleLink}>
          <h3 className={styles.title}>{productTitle}</h3>
        </Link>
        <span className={styles.price}>{price}</span>
      </div>
    </article>
  );
}
