/**
 * Default dietary / label tags for dish create/edit.
 * Admins only select from this list — no freeform custom tags.
 */
export const DIETARY_TAG_GROUPS = [
  {
    label: 'Diet',
    tags: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain', 'Egg-Free'],
  },
  {
    label: 'Free-from / allergens',
    tags: [
      'Gluten-Free',
      'Dairy-Free',
      'Nut-Free',
      'Contains Nuts',
      'Contains Dairy',
      'Contains Gluten',
      'Contains Egg',
      'Contains Seafood',
    ],
  },
  {
    label: 'Prep & spice',
    tags: ['Halal', 'Mild', 'Spicy', 'Hot'],
  },
  {
    label: 'Highlights',
    tags: ["Chef's Pick", 'Signature', 'Popular', 'Best Seller', 'Must Try', 'New'],
  },
];

/** Tag that surfaces a dish in the guest “Signature Dishes” section. */
export const SIGNATURE_DISH_TAG = 'Signature';

export const DIETARY_TAG_PRESETS = DIETARY_TAG_GROUPS.flatMap((group) => group.tags);

/**
 * Veg / non-veg marker from admin dietary tags only.
 * Returns 'veg' | 'non-veg' | null (no marker if diet not tagged).
 */
export function getDietMarker(dietaryTags = []) {
  const tags = (dietaryTags || []).map((t) => String(t).trim().toLowerCase());
  const isVeg = tags.some((t) => t === 'vegetarian' || t === 'vegan' || t === 'jain');
  const isNonVeg = tags.some(
    (t) => t === 'non-vegetarian' || t === 'non vegetarian' || t === 'nonveg' || t === 'non-veg',
  );
  if (isVeg) return 'veg';
  if (isNonVeg) return 'non-veg';
  return null;
}
