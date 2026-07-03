export const CATEGORIES = [
  { slug: 'hospitality', label: 'Hospitality', color: '#f97316', emoji: '🍽️' },
  { slug: 'retail',      label: 'Retail',      color: '#8b5cf6', emoji: '🛍️' },
  { slug: 'warehouse',   label: 'Warehouse',   color: '#0ea5e9', emoji: '📦' },
  { slug: 'beauty',      label: 'Beauty',      color: '#ec4899', emoji: '💇' },
  { slug: 'office',      label: 'Office',      color: '#10b981', emoji: '💼' },
  { slug: 'other',       label: 'Other',       color: '#64748b', emoji: '🏷️' },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.slug, c]));
