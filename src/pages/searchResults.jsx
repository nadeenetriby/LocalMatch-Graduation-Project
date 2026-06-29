import { useEffect, useMemo, useState } from 'react';
import { inferCategory } from '../utils/category';
import { aiSearch, searchAllProducts } from '../api';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, FilterIcon } from '../components/icons';
import { useFavorites } from '../context/FavoritesContext';
import { cn } from '../utils/classNames';
import ProductCard from '../components/ProductCard/ProductCard';
import LoadingState from '../components/LoadingState/LoadingState';
import EmptyState from '../components/EmptyState/EmptyState';
import styles from '../styles/searchResults.module.css';

const CATEGORIES = [
  { key: 'ALL', label: 'ALL' },
  { key: 'TOPS', label: 'TOPS' },
  { key: 'BOTTOMS', label: 'BOTTOMS' },
  
];

function mapProducts(items) {
  return items.map((p, index) => ({
    id: p.sourceId || p._id || index,
    resultKey: `${p.sourceId || p._id || 'result'}-${p.aiResultIndex ?? index}`,
    brand: p.brand,
    title: p.name,
    price: p.price != null ? `${p.price} ${p.currency || ''}`.trim() : '',
    rawPrice: p.price,
    image: p.matchedImageUrl || p.images?.[0],
    isAvailable: p.isAvailable !== false,
    isNew: false,
  }));
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryFromUrl = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(queryFromUrl || '');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(50000);
  const [category, setCategory] = useState('ALL');
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  const { isFavorite, toggleFavorite } = useFavorites();
  const location = useLocation();

  const aiSearchQuery = location.state?.aiSearchQuery || '';
  const displaySearch = aiSearchQuery || queryFromUrl || searchTerm || location.state?.searchQuery || '';
  const imageResults = location.state?.imageResults;
  const isImageSearch = Boolean(imageResults?.length);
  const isAiTextSearch = Boolean(aiSearchQuery) && !isImageSearch;

  useEffect(() => {
    setSearchTerm(queryFromUrl || '');
    setPage(1);
  }, [queryFromUrl]);

  useEffect(() => {
    setPage(1);
  }, [category, priceMin, priceMax]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        if (imageResults?.length > 0) {
          const productRes = await fetch(
            'http://localhost:5000/api/products/by-urls',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ urls: imageResults }),
            }
          );

          const productData = await productRes.json();
          setAllProducts(mapProducts(productData));
          return;
        }

        if (aiSearchQuery) {
          const aiData = await aiSearch(aiSearchQuery);
          const urls = aiData?.results || [];
          if (!urls.length) {
            setAllProducts([]);
            return;
          }

          const productRes = await fetch(
            'http://localhost:5000/api/products/by-urls',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ urls }),
            }
          );

          const productData = await productRes.json();
          setAllProducts(mapProducts(productData));
          return;
        }

        if (queryFromUrl) {
          const productData = await searchAllProducts(queryFromUrl, {
            category,
            priceMin,
            priceMax,
          });
          setAllProducts(mapProducts(productData));
          return;
        }

        setAllProducts([]);
      } catch (err) {
        console.error(err);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [aiSearchQuery, category, imageResults, priceMax, priceMin, queryFromUrl]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const price = Number(product.rawPrice ?? product.price) || 0;
      if (price < priceMin || price > priceMax) return false;
      if (category !== 'ALL' && inferCategory(product.title) !== category) {
        return false;
      }
      return true;
    });
  }, [allProducts, category, priceMin, priceMax]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const products = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  const clearFilters = () => {
    setCategory('ALL');
    setPriceMin(0);
    setPriceMax(50000);
    setPage(1);
  };

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const pageNums = () => {
    const out = [];
    const max = Math.min(totalPages, 5);
    const start = Math.min(page, Math.max(1, totalPages - 4));
    for (let i = 0; i < max; i += 1) {
      const p = start + i;
      if (p <= totalPages) out.push(p);
    }
    return out;
  };

  const sendImageToAI = async (file) => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:8000/search-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      const urls = data.results || [];

      const productRes = await fetch(
        'http://localhost:5000/api/products/by-urls',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls }),
        }
      );

      const productData = await productRes.json();

      setAllProducts(
        productData.map((p, index) => ({
          id: p.sourceId || p._id || index,
          resultKey: `${p.sourceId || p._id || 'result'}-${p.aiResultIndex ?? index}`,
          brand: p.brand,
          title: p.name,
          price: p.price != null ? `${p.price} ${p.currency || ''}`.trim() : '',
          rawPrice: p.price,
          image: p.matchedImageUrl || p.images?.[0],
          isAvailable: p.isAvailable !== false,
          isNew: false,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.resultsHeader}>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          <ArrowLeftIcon size={14} />
          Back
        </button>
        <div className={styles.headerCopy}>
          <p className={styles.resultsMeta} aria-live="polite">
            Showing <strong>{filteredProducts.length}</strong> results
            {displaySearch && !isImageSearch && (
              <> for <strong>&quot;{displaySearch}&quot;</strong></>
            )}
          </p>
          {(isImageSearch || isAiTextSearch) && (
            <div className={styles.queryContext}>
              <span className={styles.queryBadge}>AI matched</span>
              <span>{isImageSearch ? 'Results for your image' : 'Results for your description'}</span>
            </div>
          )}
        </div>
      </header>

      <div className={styles.main}>
        <aside className={styles.sidebar}>
          <div className={styles.filterGroup}>
            <div className={styles.filterHeader}>
              <FilterIcon size={16} />
              <h2>Filters</h2>
            </div>
            <h3>Category</h3>
            <div className={styles.categoryButtons}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={cn(styles.catBtn, category === c.key && styles.active)}
                  onClick={() => { setCategory(c.key); setPage(1); }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <h3>Price range</h3>
            <div className={styles.priceInputs}>
              <div className={styles.priceInputWrapper}>
                <label htmlFor="priceMin">Min</label>
                <input
                  id="priceMin"
                  type="number"
                  className={styles.priceInput}
                  value={priceMin}
                  onChange={(e) => { setPriceMin(Number(e.target.value) || 0); setPage(1); }}
                  min={0}
                />
              </div>
              <div className={styles.priceInputWrapper}>
                <label htmlFor="priceMax">Max</label>
                <input
                  id="priceMax"
                  type="number"
                  className={styles.priceInput}
                  value={priceMax}
                  onChange={(e) => { setPriceMax(Number(e.target.value) || 0); setPage(1); }}
                  min={0}
                />
              </div>
            </div>
            <button type="button" className={styles.clearButton} onClick={clearFilters}>
              Clear all filters
            </button>
          </div>
        </aside>

        <section className={styles.gridSection}>
          {loading && <LoadingState count={8} />}
          {!loading && filteredProducts.length === 0 && (
            <EmptyState
              headline="Nothing found"
              sub="Try a different image or change your description."
              cta="Browse brands"
              ctaHref="/brands"
            />
          )}
          {!loading && filteredProducts.length > 0 && (
            <>
              <div className={styles.productGrid}>
                {products.map((product) => (
                  <ProductCard
                    key={product.resultKey || product.id}
                    id={product.id}
                    brand={product.brand}
                    title={product.title}
                    price={product.price}
                    image={product.image}
                    isAvailable={product.isAvailable}
                    isNew={product.isNew}
                    isLiked={isFavorite(product.id)}
                    onLike={() => toggleFavorite(product.id)}
                  />
                ))}
              </div>
              <nav className={styles.pagination} aria-label="Search results pages">
                <button
                  type="button"
                  className={styles.nextBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Prev
                </button>
                {pageNums().map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(styles.pageBtn, page === p && styles.activePage)}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.nextBtn}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </nav>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
