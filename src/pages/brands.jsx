import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon } from '../components/icons';
import { getBrands } from '../api';
import { brandCardStyle } from '../utils/brandColor';
import CommunitySection from '../components/CommunitySection/CommunitySection';
import LoadingState from '../components/LoadingState/LoadingState';
import styles from '../styles/brands.module.css';

export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const limit = 12;

  const load = useCallback(async (p) => {
    setLoading(true);
    setError('');
    try {
      const data = await getBrands(p, limit);
      setBrands(data.items || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setError('Failed to load brands.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const pageNumbers = () => {
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, page - half);
    const end = Math.min(totalPages, start + windowSize - 1);
    if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);
    const nums = [];
    for (let i = start; i <= end; i += 1) nums.push(i);
    return nums;
  };

  const nums = pageNumbers();

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <header className={styles.brandsHeader}>
          <h1 className={styles.mainTitle}>The brands</h1>
          <p className={styles.subtitle}>
            Discover independent clothing labels from local creators in your area.
          </p>
        </header>

        <section className={styles.gridSection}>
          {loading && (
            <div className={styles.loadingFull}>
              <LoadingState count={6} />
            </div>
          )}
          {error && <p className={styles.error} role="alert">{error}</p>}
          {!loading && !error && brands.map((brand) => {
            const slug = encodeURIComponent(brand.name);
            const colors = brandCardStyle(brand.name);
            return (
              <article key={brand._id || brand.name} className={styles.brandCard}>
                <Link
                  to={`/brand/${slug}/items`}
                  className={styles.brandLogoBox}
                  style={{ ...colors, textDecoration: 'none' }}
                >
                  <h2>
                    {brand.name.toUpperCase().split(' ').map((word, i) => (
                      <React.Fragment key={i}>{word}<br /></React.Fragment>
                    ))}
                  </h2>
                </Link>
                <div className={styles.brandInfo}>
                  <p>{brand.productCount} products available</p>
                  <Link to={`/brand/${slug}/items`} className={styles.exploreLink}>
                    Explore collection
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        {!loading && !error && totalPages > 1 && (
          <div className={styles.pagination}>
            <button type="button" className={styles.pageBtn} aria-label="Previous page" onClick={goPrev} disabled={page <= 1}>
              <ArrowLeftIcon />
            </button>
            {nums.map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.pageBtn} ${n === page ? styles.activePage : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            {totalPages > nums[nums.length - 1] && (
              <>
                <span className={styles.pageEllipsis}>–</span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </button>
              </>
            )}
            <button type="button" className={styles.pageBtn} aria-label="Next page" onClick={goNext} disabled={page >= totalPages}>
              <ArrowRightIcon />
            </button>
          </div>
        )}

        <CommunitySection />
      </main>
    </div>
  );
}
