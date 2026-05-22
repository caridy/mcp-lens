/**
 * Fake shoe inventory data. Seven tennis shoes across five brands and three
 * categories (all-court, clay, grass) so the comparison lens has interesting
 * differences to highlight. Numbers are illustrative — this is a demo.
 *
 * Image URLs are public-domain stock photography hosted on Unsplash.
 * They're hot-linked here for POC simplicity; vendor them locally if the
 * demo needs to survive Unsplash's terms or be air-gapped.
 */

export interface Shoe {
  id: string;
  name: string;
  brand: string;
  category: 'all-court' | 'clay' | 'grass';
  weightGrams: number;
  drop: string;
  cushioning: 'soft' | 'medium' | 'firm';
  stability: 'low' | 'medium' | 'high';
  durability: 'low' | 'medium' | 'high';
  priceUsd: number;
  imageSrc: string;
  description: string;
}

export const SHOES: Shoe[] = [
  {
    id: 'nike-vapor-cage',
    name: 'Vapor Cage 5',
    brand: 'Nike',
    category: 'all-court',
    weightGrams: 425,
    drop: '10mm',
    cushioning: 'firm',
    stability: 'high',
    durability: 'high',
    priceUsd: 150,
    imageSrc:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=480&auto=format&fit=crop',
    description:
      'Durable all-court workhorse with outsole reinforcement for hard-court wear.',
  },
  {
    id: 'nike-gp-challenge',
    name: 'GP Challenge Pro',
    brand: 'Nike',
    category: 'all-court',
    weightGrams: 380,
    drop: '8mm',
    cushioning: 'medium',
    stability: 'medium',
    durability: 'medium',
    priceUsd: 130,
    imageSrc:
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=480&auto=format&fit=crop',
    description:
      'Lighter all-court option with a more responsive forefoot. Popular with baseliners.',
  },
  {
    id: 'asics-gel-resolution',
    name: 'Gel-Resolution 9',
    brand: 'Asics',
    category: 'all-court',
    weightGrams: 395,
    drop: '10mm',
    cushioning: 'medium',
    stability: 'high',
    durability: 'high',
    priceUsd: 150,
    imageSrc:
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=480&auto=format&fit=crop',
    description:
      'Balanced all-court shoe with consistent stability and predictable cushioning.',
  },
  {
    id: 'asics-solution-speed',
    name: 'Solution Speed FF 3',
    brand: 'Asics',
    category: 'all-court',
    weightGrams: 340,
    drop: '7mm',
    cushioning: 'soft',
    stability: 'medium',
    durability: 'medium',
    priceUsd: 160,
    imageSrc:
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=480&auto=format&fit=crop',
    description:
      'The lightest option here. Fast-twitch baseliners and attackers tend to pick this one.',
  },
  {
    id: 'babolat-jet-mach',
    name: 'Jet Mach III',
    brand: 'Babolat',
    category: 'clay',
    weightGrams: 355,
    drop: '8mm',
    cushioning: 'medium',
    stability: 'medium',
    durability: 'medium',
    priceUsd: 140,
    imageSrc:
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=480&auto=format&fit=crop',
    description:
      'Clay-court specialist with a herringbone outsole. Lightweight for quick lateral movement.',
  },
  {
    id: 'adidas-barricade',
    name: 'Barricade 13',
    brand: 'Adidas',
    category: 'all-court',
    weightGrams: 410,
    drop: '10mm',
    cushioning: 'firm',
    stability: 'high',
    durability: 'high',
    priceUsd: 170,
    imageSrc:
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=480&auto=format&fit=crop',
    description:
      'Heavyweight stability shoe favored by hard hitters. Reinforced toe and full-length stability frame.',
  },
  {
    id: 'wilson-rush-pro',
    name: 'Rush Pro 4.0',
    brand: 'Wilson',
    category: 'grass',
    weightGrams: 365,
    drop: '8mm',
    cushioning: 'medium',
    stability: 'medium',
    durability: 'medium',
    priceUsd: 145,
    imageSrc:
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=480&auto=format&fit=crop',
    description:
      'Grass-court specialist with a low-profile pimpled outsole. Quick and agile across short rallies.',
  },
];

export function findShoe(id: string): Shoe | null {
  return SHOES.find((s) => s.id === id) ?? null;
}

export function searchShoes(query: {
  brand?: string;
  category?: Shoe['category'];
  maxPrice?: number;
}): Shoe[] {
  return SHOES.filter((s) => {
    if (query.brand && s.brand.toLowerCase() !== query.brand.toLowerCase())
      return false;
    if (query.category && s.category !== query.category) return false;
    if (query.maxPrice !== undefined && s.priceUsd > query.maxPrice)
      return false;
    return true;
  });
}
