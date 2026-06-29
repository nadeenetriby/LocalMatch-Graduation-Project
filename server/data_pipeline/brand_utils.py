"""Brand URL helpers."""

import re
from urllib.parse import urlparse


def normalize_domain(url: str) -> str:
    domain = url.strip().rstrip("/")
    if not domain:
        return ""
    if not domain.startswith("http"):
        domain = f"https://{domain}"
    return domain


def validate_shopify_url(url: str) -> tuple[bool, str]:
    """Return (ok, normalized_url_or_error)."""
    import requests

    domain = normalize_domain(url)
    if not domain:
        return False, "URL is required"

    try:
        parsed = urlparse(domain)
        if not parsed.netloc:
            return False, "Invalid URL"
    except Exception:
        return False, "Invalid URL"

    probe = f"{domain}/products.json?limit=1"
    try:
        r = requests.get(probe, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code != 200:
            return False, f"Shopify products API returned {r.status_code}"
        data = r.json()
        if "products" not in data:
            return False, "URL does not appear to be a Shopify store"
    except requests.RequestException as exc:
        return False, f"Could not reach store: {exc}"

    return True, domain


def derive_brand_name_from_url(url: str) -> str:
    """Best-effort brand slug from a store URL."""
    domain = normalize_domain(url)
    parsed = urlparse(domain)
    host = (parsed.netloc or "").lower().replace("www.", "")
    path = (parsed.path or "").strip("/")

    if host.endswith(".myshopify.com"):
        return host.split(".")[0]

    if host == "sllr.co" and path:
        return path.split("/")[0].lower()

    if path and host in ("digajeans.com",):
        return host.split(".")[0]

    stem = host.split(".")[0]
    return re.sub(r"[^a-z0-9-]", "", stem.lower())
