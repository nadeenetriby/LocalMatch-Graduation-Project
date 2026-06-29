import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBrandProducts } from '../api';
import { brandCardStyle } from '../utils/brandColor';
import ProductCard from '../components/ProductCard/ProductCard';
import LoadingState from '../components/LoadingState/LoadingState';
import { useFavorites } from '../context/FavoritesContext';
import { cn } from '../utils/classNames';
import styles from '../styles/branditems.module.css';

export default function BrandItems() {
  const { brandSlug } = useParams();
  const brandName = decodeURIComponent(brandSlug || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    setCurrentPage(1);
  }, [brandName]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!brandName) return;
      setLoading(true);
      try {
        const data = await getBrandProducts(brandName, currentPage, 24);
        setProducts(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [brandName, currentPage]);

  const displayName = brandName ? brandName.toUpperCase() : 'BRAND';
  const brandColors = brandCardStyle(brandName);

  const pageButtons = () => {
    const nums = [];
    const maxBtn = Math.min(totalPages, 5);
    const start = Math.min(currentPage, Math.max(1, totalPages - 4));
    for (let i = 0; i < maxBtn; i += 1) {
      const p = start + i;
      if (p <= totalPages) nums.push(p);
    }
    return nums;
  };

  return (
    <div className={styles.pageContainer}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        {' / '}
        <Link to="/brands">Brands</Link>
        {' / '}
        {displayName}
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroBanner} style={{ backgroundColor: brandColors.backgroundColor, color: brandColors.color }}>
          <h1>
            {displayName.split(' ').map((word, i, arr) => (
              <React.Fragment key={i}>
                {word}
                {i < arr.length - 1 && <br />}
              </React.Fragment>
            ))}
          </h1>
        </div>
      </section>

      <main className={styles.mainContent}>
        {loading && <LoadingState count={8} />}
        {!loading && (
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard
                key={product.sourceId}
                id={product.sourceId}
                brand={product.brand.toUpperCase()}
                title={product.name}
                price={`${product.price} ${product.currency || ''}`.trim()}
                image={product.images?.[0]}
                isAvailable={product.isAvailable !== false}
                isLiked={isFavorite(product.sourceId)}
                onLike={() => toggleFavorite(product.sourceId)}
              />
            ))}
          </div>
        )}
        {!loading && totalPages > 1 && (
          <div className={styles.pagination}>
            {pageButtons().map((p) => (
              <button
                key={p}
                type="button"
                className={cn(styles.pageBtn, currentPage === p && styles.activePage)}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className={styles.nextBtn}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
