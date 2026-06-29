import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BoltIcon } from "../components/icons";
import { FEATURED_BRANDS } from "../data/brands";
import { getFeaturedBrandsPublic } from "../api";
import CommunitySection from "../components/CommunitySection/CommunitySection";
import UploadZone from "../components/UploadZone/UploadZone";
import styles from "../styles/homepage.module.css";

const BrandCard = ({
  name,
  title,
  category,
  drops,
  color,
  textColor = "white",
  brandName,
}) => {
  const slug = encodeURIComponent(brandName || title);
  return (
    <Link to={`/brand/${slug}/items`} className={styles.brandCardLink}>
      <div className={styles.brandCard}>
        <div
          className={styles.brandImage}
          style={{ backgroundColor: color, color: textColor }}
        >
          <h3>{name}</h3>
        </div>
        <div className={styles.brandInfo}>
          <h4>{title}</h4>
          <p>{category}</p>
          <span className={styles.dropTag}>{drops} Products</span>
        </div>
      </div>
    </Link>
  );
};

function searchModeLabel(hasImage, hasText) {
  if (hasImage && hasText) return "IMAGE + TEXT";
  if (hasImage) return "IMAGE ONLY";
  if (hasText) return "TEXT ONLY";
  return "ADD IMAGE OR TEXT";
}

export default function Homepage() {
  const navigate = useNavigate();
  const [vibe, setVibe] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [featured, setFeatured] = useState(FEATURED_BRANDS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getFeaturedBrandsPublic();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setFeatured(data);
        }
      } catch {
        /* keep static fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleImageSelect = (file) => {
    if (!file) return;

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleMatch = async (e) => {
    e.preventDefault();

    const hasText = vibe.trim().length > 0;
    const hasImage = selectedImage !== null;

    if (!hasText && !hasImage) {
      alert("Please enter text or upload an image");
      return;
    }

    if (hasText && !hasImage) {
      navigate("/search", {
        state: {
          aiSearchQuery: vibe.trim(),
          searchQuery: vibe.trim(),
        },
      });
      return;
    }

    setIsLoading(true);

    try {
      let data;
      let results = [];

      const formData = new FormData();

      if (hasText) formData.append("text", vibe.trim());
      if (hasImage) formData.append("file", selectedImage);

      const url =
        hasText && hasImage
          ? "http://localhost:8000/search-combined"
          : "http://localhost:8000/search-image";

      const options = { method: "POST", body: formData };

      const res = await fetch(url, options);

      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Backend did not return JSON: " + text);
      }

      results = data?.results ?? [];

      console.log("SEARCH RESULTS:", results);

      navigate("/search", {
        state: {
          imageResults: results,
          searchQuery: vibe.trim() || "Image Search",
        },
      });
    } catch (err) {
      console.error("Search failed:", err);
      alert("Search failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const hasText = vibe.trim().length > 0;
  const hasImage = selectedImage !== null;

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            Find the look,
            <br />
            <span className={styles.highlightText}>stay local.</span>
          </h1>

          <div className={styles.searchCard}>
            <div className={styles.uploadZone}>
              <UploadZone
                preview={imagePreview}
                onFileSelect={handleImageSelect}
                onClear={clearImage}
              />
            </div>

            <hr className={styles.separator} />

            <div className={styles.textZone}>
              <textarea
                placeholder="Describe what you're looking for…"
                className={styles.vibeInput}
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
              />
            </div>

            <div className={styles.actionBar}>
              <span className={styles.modeBadge}>
                {searchModeLabel(hasImage, hasText)}
              </span>
              <button
                type="button"
                className={styles.matchBtn}
                onClick={handleMatch}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    Searching…
                  </>
                ) : (
                  <>
                    Match me <BoltIcon />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.featuredSection} id="brands">
        <div className={styles.featuredHeader}>
          <div className={styles.featuredTitleGroup}>
            <h2>Featured local brands</h2>
            <p>
              Support the creators behind the neighborhood&apos;s finest drip.
            </p>
          </div>
          <div className={styles.featuredActions}>
            <Link to="/brands" className={styles.viewAllLink}>
              View all brands
            </Link>
          </div>
        </div>
        <div className={styles.brandsGrid}>
          {featured.map((brand) => (
            <BrandCard key={`${brand.name}-${brand.title}`} {...brand} />
          ))}
        </div>
      </section>

      <CommunitySection />
    </div>
  );
}
