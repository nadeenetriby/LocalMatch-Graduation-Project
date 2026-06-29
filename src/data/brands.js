/** Mock brand data - single source of truth */

export const BRANDS = [
  {
    id: 1,
    name: 'URBAN NOMAD',
    color: '#f5820d',
    textColor: '#fff',
    desc: 'Raw streetwear aesthetics with a focus on sustainable denim and oversized silhouettes.',
    category: 'Streetwear & Basics',
    drops: 12,
  },
  {
    id: 2,
    name: 'HEAVENLY SEAS',
    color: '#c91a46',
    textColor: '#fff',
    desc: 'Ethereal beachwear and premium linen pieces designed for the modern coastal wanderer.',
    category: 'Luxury Beachwear',
    drops: 8,
  },
  {
    id: 3,
    name: 'NORMIT STUDIO',
    color: '#004e57',
    textColor: '#fff',
    desc: 'Hyper-minimalist essentials that blend functional utility with high-fashion tailoring.',
    category: 'Minimalist Essentials',
    drops: 24,
  },
  {
    id: 4,
    name: 'DAY OFF',
    color: '#ffd700',
    textColor: '#000',
    desc: 'Loungewear for the creative class. Comfort-first designs for working from anywhere.',
    category: 'Casual Outerwear',
    drops: 15,
  },
  {
    id: 5,
    name: 'VELVET RUSH',
    color: '#fa92a6',
    textColor: '#000',
    desc: "Bold colors and 80s inspired rave culture silhouettes re-imagined for today's scene.",
    category: 'Rave & Bold',
    drops: 10,
  },
  {
    id: 6,
    name: 'GHOST TECH',
    color: '#fff',
    textColor: '#000',
    desc: 'Futuristic technical apparel utilizing cutting-edge fabrics and modular storage systems.',
    category: 'Technical Wear',
    drops: 18,
  },
];

/** Featured brands for homepage (subset with different display format) */
export const FEATURED_BRANDS = [
  { name: 'URBAN', title: 'URBAN NOMAD', category: 'Streetwear & Basics', drops: '12', color: '#0A4852' },
  { name: 'HVNLY', title: 'HEAVENLY SEAS', category: 'Luxury Beachwear', drops: '8', color: '#FF8800' },
  { name: 'NORM IT', title: 'NORMIT', category: 'Minimalist Essentials', drops: '24', color: '#C91A52' },
  { name: 'DAY OFF', title: 'DAY OFF', category: 'Casual Outerwear', drops: '15', color: '#F4D010', textColor: 'black' },
];
