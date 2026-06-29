import { useEffect, useState } from 'react';
import { getProductsBatch } from '../api';
import { useFavorites } from '../context/FavoritesContext';
import CommunitySection from '../components/CommunitySection/CommunitySection';
import ProductCard from '../components/ProductCard/ProductCard';
import LoadingState from '../components/LoadingState/LoadingState';
import EmptyState from '../components/EmptyState/EmptyState';
import styles from '../styles/fav.module.css';

export default function Favorites() {
  const { favoriteIds, isFavorite, toggleFavorite } = useFavorites();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!favoriteIds.length) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const products = await getProductsBatch(favoriteIds);
        const order = new Map(favoriteIds.map((fid, i) => [fid, i]));
        products.sort(
          (a, b) => (order.get(a.sourceId) ?? 0) - (order.get(b.sourceId) ?? 0)
        );
        setItems(
          products.map((p) => ({
            id: p.sourceId,
            brand: p.brand.toUpperCase(),
            name: p.name,
            price: `${p.price} ${p.currency || ''}`.trim(),
            image: p.images?.[0],
            isAvailable: p.isAvailable !== false,
          }))
        );
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [favoriteIds]);

  return (
    <div className={styles.pageContainer}>
      <section className={styles.favoritesSection}>
        <h1 className={styles.pageTitle}>Your favorites</h1>
        {loading && <LoadingState count={4} />}
        {!loading && favoriteIds.length === 0 && (
          <EmptyState
            headline="Your collection is empty"
            sub="Tap ♥ on any product to save it here."
            cta="Discover Products"
            ctaHref="/search"
          />
        )}
        {!loading && favoriteIds.length > 0 && (
          <div className={styles.grid}>
            {items.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                brand={product.brand}
                name={product.name}
                price={product.price}
                image={product.image}
                isAvailable={product.isAvailable}
                isLiked={isFavorite(product.id)}
                onLike={() => toggleFavorite(product.id)}
              />
            ))}
          </div>
        )}
      </section>
      <CommunitySection />
    </div>
  );
}
