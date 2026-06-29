import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminBrands,
  getAdminCommunity,
  getAdminFeaturedBrands,
  getAdminOverview,
  createAdminBrand,
  updateAdminBrand,
  deleteAdminBrand,
  saveAdminFeaturedBrands,
  scrapeAdminBrand,
  getAdminSyncStatus,
  runAdminFullSync,
} from "../../api";
import { useAuth } from "../../context/AuthContext";
import styles from "./AdminDashboard.module.css";

const emptyFeatured = () => ({
  brandName: "",
  name: "",
  title: "",
  category: "",
  drops: "0",
  color: "#0A4852",
  textColor: "white",
});

function shortBrandLabel(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 1) return words[0]?.toUpperCase() || "";
  return words.map((word) => word[0]?.toUpperCase() || "").join("");
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [overview, setOverview] = useState(null);
  const [community, setCommunity] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandUrl, setNewBrandUrl] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [featuredDraft, setFeaturedDraft] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [brandsBusy, setBrandsBusy] = useState(false);
  const [featuredBusy, setFeaturedBusy] = useState(false);
  const [newBrandActive, setNewBrandActive] = useState(true);
  const [editActive, setEditActive] = useState(true);
  const [brandMsg, setBrandMsg] = useState("");
  const [featuredMsg, setFeaturedMsg] = useState("");
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncBusy, setSyncBusy] = useState(false);

  const refreshOverview = useCallback(async () => {
    try {
      const ov = await getAdminOverview();
      setOverview(ov);
    } catch {
      /* ignore */
    }
  }, []);

  const loadBrands = useCallback(async () => {
    setBrandsBusy(true);
    try {
      const list = await getAdminBrands();
      setBrands(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || "Failed to load brands");
    } finally {
      setBrandsBusy(false);
    }
  }, []);

  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await getAdminSyncStatus();
      setSyncStatus(status);
    } catch {
      /* ignore */
    }
  }, []);

  const loadFeatured = useCallback(async () => {
    try {
      const list = await getAdminFeaturedBrands();
      if (Array.isArray(list) && list.length > 0) {
        setFeaturedDraft(list.map((row) => ({ ...row })));
      } else {
        setFeaturedDraft([emptyFeatured()]);
      }
    } catch (e) {
      setError(e.message || "Failed to load featured brands");
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [ov, comm] = await Promise.all([
          getAdminOverview(),
          getAdminCommunity(1, 200),
        ]);
        setOverview(ov);
        setCommunity(comm.items || []);
        await Promise.all([loadBrands(), loadFeatured(), loadSyncStatus()]);
      } catch (e) {
        setError(e.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loadBrands, loadFeatured, loadSyncStatus]);

  const handleAddBrand = async (e) => {
    e.preventDefault();
    const name = newBrandName.trim();
    const url = newBrandUrl.trim();
    if (!name || !url) {
      setError("Name and URL are required");
      return;
    }
    setBrandsBusy(true);
    setError("");
    setBrandMsg("");
    try {
      const result = await createAdminBrand({ name, url, active: newBrandActive });
      const stats = result.scrape?.stats;
      if (stats) {
        setBrandMsg(
          `Brand added. Scrape: ${stats.inserted ?? 0} new, ${stats.updated ?? 0} updated, ${stats.unavailable ?? 0} unavailable.`
        );
      } else if (result.scrape?.error || result.warning) {
        setBrandMsg(result.warning || result.scrape.error);
      } else {
        setBrandMsg("Brand added and scraped successfully.");
      }
      setNewBrandName("");
      setNewBrandUrl("");
      await loadBrands();
      await refreshOverview();
      await loadSyncStatus();
    } catch (err) {
      setError(err.message || "Could not add brand");
    } finally {
      setBrandsBusy(false);
    }
  };

  const handleScrapeBrand = async (b) => {
    setBrandsBusy(true);
    setError("");
    setBrandMsg("");
    try {
      const result = await scrapeAdminBrand(b._id);
      const stats = result.scrape?.stats;
      setBrandMsg(
        stats
          ? `Scraped ${b.name}: ${stats.inserted ?? 0} new, ${stats.updated ?? 0} updated.`
          : `Scrape finished for ${b.name}.`
      );
      await loadBrands();
      await refreshOverview();
      await loadSyncStatus();
    } catch (err) {
      setError(err.message || "Scrape failed");
    } finally {
      setBrandsBusy(false);
    }
  };

  const handleFullSync = async () => {
    if (!window.confirm("Run a full sync for all active brands? This may take a long time.")) {
      return;
    }
    setSyncBusy(true);
    setError("");
    setBrandMsg("");
    try {
      await runAdminFullSync();
      setBrandMsg("Full sync completed.");
      await loadBrands();
      await refreshOverview();
      await loadSyncStatus();
    } catch (err) {
      setError(err.message || "Full sync failed");
    } finally {
      setSyncBusy(false);
    }
  };

  const startEdit = (b) => {
    setEditId(b._id);
    setEditName(b.name);
    setEditUrl(b.url || "");
    setEditActive(b.active !== false);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditUrl("");
    setEditActive(true);
  };

  const saveEdit = async (id) => {
    const name = editName.trim();
    if (!name) return;
    setBrandsBusy(true);
    setError("");
    try {
      await updateAdminBrand(id, {
        name,
        url: editUrl.trim(),
        active: editActive,
      });
      cancelEdit();
      await loadBrands();
      await refreshOverview();
    } catch (err) {
      setError(err.message || "Could not update brand");
    } finally {
      setBrandsBusy(false);
    }
  };

  const handleDeleteBrand = async (b) => {
    if (
      !window.confirm(
        `Delete brand "${b.name}"? This only works if no products use it.`
      )
    ) {
      return;
    }
    setBrandsBusy(true);
    setError("");
    try {
      await deleteAdminBrand(b._id);
      await loadBrands();
      await refreshOverview();
    } catch (err) {
      setError(err.message || "Could not delete brand");
    } finally {
      setBrandsBusy(false);
    }
  };

  const selectFeaturedBrand = (index, brandName) => {
    const normalized = String(brandName || "").trim().toLowerCase();
    const brand = brands.find((b) => b.name === normalized);
    if (!brand) {
      updateFeaturedRow(index, "brandName", normalized);
      return;
    }
    setFeaturedDraft((rows) =>
      rows.map((row, i) =>
        i === index
          ? {
              ...row,
              brandName: brand.name,
              name: shortBrandLabel(brand.name) || brand.name.toUpperCase(),
              title: brand.name.toUpperCase(),
              drops: String(brand.productCount ?? 0),
            }
          : row
      )
    );
  };

  const updateFeaturedRow = (index, field, value) => {
    setFeaturedDraft((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const addFeaturedRow = () => {
    setFeaturedDraft((rows) => [...rows, emptyFeatured()]);
  };

  const removeFeaturedRow = (index) => {
    setFeaturedDraft((rows) => rows.filter((_, i) => i !== index));
  };

  const handleSaveFeatured = async (e) => {
    e.preventDefault();
    setFeaturedBusy(true);
    setFeaturedMsg("");
    setError("");
    try {
      const cleaned = featuredDraft.filter(
        (r) => String(r.brandName || "").trim() && String(r.name || "").trim() && String(r.title || "").trim()
      );
      if (cleaned.length === 0) {
        setFeaturedMsg("Add at least one row with a selected brand.");
        return;
      }
      for (const r of cleaned) {
        if (!String(r.color || "").trim()) {
          setFeaturedMsg("Each row needs a color.");
          return;
        }
        const brand = brands.find((b) => b.name === String(r.brandName).trim().toLowerCase());
        if (!brand) {
          setFeaturedMsg(`Unknown brand: ${r.brandName}`);
          return;
        }
      }
      await saveAdminFeaturedBrands(cleaned);
      setFeaturedMsg("Featured brands saved. Refresh the homepage to see changes.");
    } catch (err) {
      setError(err.message || "Could not save featured brands");
    } finally {
      setFeaturedBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin dashboard</h1>
          <p className={styles.sub}>
            Signed in as {user?.email}
            {user?.role === "admin" ? " (admin)" : ""}
          </p>
        </div>
        <div className={styles.actions}>
          <Link to="/" className={styles.link}>
            Back to site
          </Link>
          <Link to="/profile" className={styles.link}>
            Profile
          </Link>
          <button type="button" className={styles.logout} onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {loading && <p>Loading…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && overview && (
        <section className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Users</span>
            <span className={styles.statValue}>{overview.userCount}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Products</span>
            <span className={styles.statValue}>{overview.productCount}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Brands</span>
            <span className={styles.statValue}>{overview.brandCount}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Community signups</span>
            <span className={styles.statValue}>{overview.communityCount}</span>
          </div>
        </section>
      )}

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionTitle}>Brands</h2>
        <p className={styles.hint}>
          Names are stored in lowercase. Adding a brand validates the URL, scrapes
          products immediately, and runs the cleaner. Only active brands are included
          in a full manual sync.
        </p>
        {brandMsg && <p className={styles.success}>{brandMsg}</p>}
        {syncStatus?.running && (
          <p className={styles.hint}>A sync is currently running…</p>
        )}
        <div className={styles.featuredActions} style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={handleFullSync}
            disabled={syncBusy || brandsBusy || syncStatus?.running}
          >
            {syncBusy ? "Syncing…" : "Run full sync now"}
          </button>
        </div>
        <form className={styles.inlineForm} onSubmit={handleAddBrand}>
          <input
            type="text"
            className={styles.textInput}
            placeholder="New brand name"
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            disabled={brandsBusy}
          />
          <input
            type="url"
            className={styles.textInput}
            placeholder="Brand URL (required)"
            value={newBrandUrl}
            onChange={(e) => setNewBrandUrl(e.target.value)}
            disabled={brandsBusy}
            required
          />
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={newBrandActive}
              onChange={(e) => setNewBrandActive(e.target.checked)}
              disabled={brandsBusy}
            />
            Active
          </label>
          <button type="submit" className={styles.btnPrimary} disabled={brandsBusy}>
            {brandsBusy ? "Adding…" : "Add brand & scrape"}
          </button>
        </form>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>URL</th>
                <th>Active</th>
                <th>Products</th>
                <th>Last scrape</th>
                <th style={{ width: "320px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    No brands yet.
                  </td>
                </tr>
              )}
              {brands.map((b) => (
                <tr key={b._id}>
                  <td>
                    {editId === b._id ? (
                      <input
                        type="text"
                        className={styles.textInput}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={brandsBusy}
                      />
                    ) : (
                      <code>{b.name}</code>
                    )}
                  </td>
                  <td>
                    {editId === b._id ? (
                      <input
                        type="url"
                        className={styles.textInput}
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        disabled={brandsBusy}
                      />
                    ) : b.url ? (
                      <a href={b.url} target="_blank" rel="noopener noreferrer">
                        {b.url}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {editId === b._id ? (
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                          disabled={brandsBusy}
                        />
                        Active
                      </label>
                    ) : b.active === false ? (
                      "No"
                    ) : (
                      "Yes"
                    )}
                  </td>
                  <td>{b.productCount ?? 0}</td>
                  <td>
                    {b.lastScrapedAt
                      ? new Date(b.lastScrapedAt).toLocaleString()
                      : "—"}
                    {b.lastScrapeStatus && b.lastScrapeStatus !== "idle" && (
                      <div>
                        <small>{b.lastScrapeStatus}</small>
                      </div>
                    )}
                  </td>
                  <td>
                    {editId === b._id ? (
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          onClick={() => saveEdit(b._id)}
                          disabled={brandsBusy}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={cancelEdit}
                          disabled={brandsBusy}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => handleScrapeBrand(b)}
                          disabled={brandsBusy || !b.url}
                        >
                          Scrape
                        </button>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => startEdit(b)}
                          disabled={brandsBusy}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.btnDanger}
                          onClick={() => handleDeleteBrand(b)}
                          disabled={brandsBusy}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionTitle}>Homepage featured brands</h2>
        <p className={styles.hint}>
          Select a catalog brand for each card. Display labels and colors can
          still be customized below.
        </p>
        {featuredMsg && <p className={styles.success}>{featuredMsg}</p>}
        <form onSubmit={handleSaveFeatured}>
          <div className={styles.featuredList}>
            {featuredDraft.map((row, index) => (
              <div key={index} className={styles.featuredCard}>
                <div className={styles.featuredGrid}>
                  <label className={styles.field}>
                    Brand
                    <input
                      type="text"
                      list={`featured-brand-options-${index}`}
                      value={row.brandName || ""}
                      onChange={(e) => selectFeaturedBrand(index, e.target.value)}
                      disabled={featuredBusy}
                      placeholder="Search brands…"
                    />
                    <datalist id={`featured-brand-options-${index}`}>
                      {brands.map((b) => (
                        <option key={b._id} value={b.name}>
                          {b.name} ({b.productCount ?? 0} products)
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <label className={styles.field}>
                    Short name
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) =>
                        updateFeaturedRow(index, "name", e.target.value)
                      }
                      disabled={featuredBusy}
                    />
                  </label>
                  <label className={styles.field}>
                    Title
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) =>
                        updateFeaturedRow(index, "title", e.target.value)
                      }
                      disabled={featuredBusy}
                    />
                  </label>
                  <label className={styles.field}>
                    Category
                    <input
                      type="text"
                      value={row.category}
                      onChange={(e) =>
                        updateFeaturedRow(index, "category", e.target.value)
                      }
                      disabled={featuredBusy}
                    />
                  </label>
                  <label className={styles.field}>
                    Products
                    <input
                      type="text"
                      value={row.drops}
                      readOnly
                      disabled
                    />
                  </label>
                  <label className={styles.field}>
                    Color
                    <input
                      type="text"
                      value={row.color}
                      onChange={(e) =>
                        updateFeaturedRow(index, "color", e.target.value)
                      }
                      disabled={featuredBusy}
                      placeholder="#0A4852"
                    />
                  </label>
                  <label className={styles.field}>
                    Text color
                    <input
                      type="text"
                      value={row.textColor}
                      onChange={(e) =>
                        updateFeaturedRow(index, "textColor", e.target.value)
                      }
                      disabled={featuredBusy}
                      placeholder="white or black"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => removeFeaturedRow(index)}
                  disabled={featuredBusy || featuredDraft.length <= 1}
                >
                  Remove row
                </button>
              </div>
            ))}
          </div>
          <div className={styles.featuredActions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={addFeaturedRow}
              disabled={featuredBusy || featuredDraft.length >= 12}
            >
              Add row
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={featuredBusy}
            >
              {featuredBusy ? "Saving…" : "Save featured brands"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.tableSection}>
        <h2 className={styles.sectionTitle}>Community emails</h2>
        <p className={styles.hint}>
          Submissions from “Join the community” on the site appear here.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {community.length === 0 && (
                <tr>
                  <td colSpan={2} className={styles.empty}>
                    No submissions yet.
                  </td>
                </tr>
              )}
              {community.map((row) => (
                <tr key={row._id ? String(row._id) : `${row.email}-${row.createdAt}`}>
                  <td>{row.email}</td>
                  <td>
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
