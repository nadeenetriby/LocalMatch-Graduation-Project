import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HeartIcon } from '../components/icons';
import { getProductById } from '../api';
import CommunitySection from '../components/CommunitySection/CommunitySection';
import { useFavorites } from '../context/FavoritesContext';
import LoadingState from '../components/LoadingState/LoadingState';
import EmptyState from '../components/EmptyState/EmptyState';
import styles from '../styles/item.module.css';

export default function Item() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getProductById(id);
        setItem(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrap}>
          <LoadingState count={1} />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className={styles.container}>
        <EmptyState
          headline="Item not found"
          sub="This product may no longer be available."
          cta="Browse brands"
          ctaHref="/brands"
        />
      </div>
    );
  }

  const brandSlug = encodeURIComponent(item.brand);

  return (
    <div className={styles.container}>
      <section className={styles.productSection}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {' / '}
          <Link to="/brands">Brands</Link>
          {' / '}
          <Link to={`/brand/${brandSlug}/items`}>{item.brand.toUpperCase()}</Link>
          {' / '}
          {item.name}
        </nav>
        <div className={styles.productGrid}>
          <div className={styles.imageColumn}>
            <div className={styles.imageFrame}>
              <img src={item.images?.[0]} alt={item.name} className={styles.productImage} />
            </div>
          </div>
          <div className={styles.detailsColumn}>
            <h1 className={styles.productTitle}>{item.name}</h1>
            <div className={styles.priceRow}>
              {item.isAvailable === false ? (
                <span className={styles.unavailableLabel}>Unavailable</span>
              ) : (
                <span className={styles.price}>
                  {item.price}{item.currency ? ` ${item.currency}` : ''}
                </span>
              )}
            </div>
            {item.isAvailable === false && (
              <p className={styles.unavailableNotice}>
                This item is no longer listed on the brand&apos;s website.
              </p>
            )}
            <div className={styles.divider} />
            <div>
              <p className={styles.label}>Description</p>
              <p className={styles.descriptionText}>
                Find this item on the {item.brand} website. Click the button below to view all details, available sizes, and purchase.
              </p>
            </div>
            <div className={styles.actionRow}>
              <a
                href={item.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryBtn}
              >
                Shop on brand site
              </a>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => toggleFavorite(item.sourceId)}
                aria-label={isFavorite(item.sourceId) ? 'Remove from favorites' : 'Add to favorites'}
              >
                <HeartIcon size={18} filled={isFavorite(item.sourceId)} />
              </button>
            </div>
            <div className={styles.moreFromBrand}>
              <Link to={`/brand/${brandSlug}/items`}>
                More from {item.brand}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CommunitySection />
    </div>
  );
}
