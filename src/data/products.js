/** Mock product data - single source of truth */

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80';
const LINEN_IMAGE = 'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?q=80&w=800&auto=format&fit=crop';
const JACKET_IMAGE = 'https://images.unsplash.com/photo-1551028719-00167b16ebc5?q=80&w=600&auto=format&fit=crop';
const MISC_IMAGE = 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

const BRAND_1_PRODUCTS = [
    { id: 1, brand: 'HEAVENLY SEAS', name: 'PACIFIC LINEN SHIRT', price: '$85.00', badge: 'NEW DROP', bottomColor: '#004d4d', isFavorite: false, image: PLACEHOLDER_IMAGE },
    { id: 2, brand: 'URBAN NOMAD', name: 'MINIMAL LINEN SLUB', price: '$95.00', isFavorite: true, image: PLACEHOLDER_IMAGE },
    { id: 3, brand: 'URBAN NOMAD', name: 'OVERSYSTEM OVERSIZED', price: '$110.00', bottomColor: '#ff8800', isFavorite: false, image: PLACEHOLDER_IMAGE },
    { id: 4, brand: 'URBAN NOMAD', name: 'MINIMAL LINEN SLUB', price: '$95.00', isFavorite: true, image: PLACEHOLDER_IMAGE },
    { id: 5, brand: 'URBAN NOMAD', name: 'CLASSIC DENIM JACKET', price: '$125.00', isFavorite: true, image: PLACEHOLDER_IMAGE },
    { id: 6, brand: 'URBAN NOMAD', name: 'SUNDAY BUTTON UP', price: '$78.00', bottomColor: '#ffd700', isFavorite: false, image: PLACEHOLDER_IMAGE },
    { id: 7, brand: 'URBAN NOMAD', name: 'CARGO PANTS', price: '$98.00', isFavorite: false, image: PLACEHOLDER_IMAGE },
    { id: 8, brand: 'URBAN NOMAD', name: 'COTTON HOODIE', price: '$72.00', bottomColor: '#004d4d', isFavorite: false, image: PLACEHOLDER_IMAGE },
];

export const PRODUCTS_BY_BRAND = {
  1: BRAND_1_PRODUCTS,
  2: BRAND_1_PRODUCTS,
  3: BRAND_1_PRODUCTS,
  4: BRAND_1_PRODUCTS,
  5: BRAND_1_PRODUCTS,
  6: BRAND_1_PRODUCTS,
};

/** Get products for a brand (falls back to first available if brand has no products) */
export function getProductsByBrandId(brandId) {
  const id = Number(brandId);
  return PRODUCTS_BY_BRAND[id] ?? PRODUCTS_BY_BRAND[1] ?? [];
}

export const FAVORITES_PRODUCTS = [
  { id: 1, brand: 'URBAN NOMAD', name: 'STRUCTURED WORK JACKET', price: '$145.00', grayscale: false },
  { id: 2, brand: 'HEAVENLY ROAD', name: 'RAW EDGE LINEN TOTE', price: '$85.00', grayscale: true },
  { id: 3, brand: 'ADDICT', name: 'HEAVYWEIGHT TEE', price: '$48.00', grayscale: false },
  { id: 4, brand: 'FAR OUT', name: 'CORDUROY CAP', price: '$35.00', grayscale: false },
];

export const SEARCH_PRODUCTS = [
  { id: 1, brand: 'HEAVENLY SEAS', title: 'PACIFIC LINEN SHIRT', price: '$85.00', image: LINEN_IMAGE, isNew: true },
  { id: 2, brand: 'URBAN NOMAD', title: 'OVERSYSTEM OVERSIZED', price: '$110.00', image: LINEN_IMAGE, isNew: false },
  { id: 3, brand: 'NORMIT', title: 'MINIMAL LINEN SLUB', price: '$95.00', image: LINEN_IMAGE, isNew: false },
  { id: 4, brand: 'DAY OFF', title: 'SUNDAY BUTTON UP', price: '$78.00', image: LINEN_IMAGE, isNew: false },
];

export const ITEM_DETAILS = {
  1: {
    name: 'STRUCTURED WORK JACKET',
    price: '$145.00',
    image: JACKET_IMAGE,
    brand: 'URBAN NOMAD',
    description: 'Premium heavyweight canvas work jacket from URBAN NOMAD. Perfect for everyday wear with authentic vintage details. Designed for quality and durability.',
  },
};
