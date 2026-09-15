/**
 * Default dietary / label tags for dish create/edit.
 * Admins can also add a custom tag under each section.
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
    label: 'Serves',
    tags: ['Serves 1', 'Serves 2', 'Serves 3', 'Serves 4', 'Serves 5+'],
    singleSelect: true,
  },
  {
    label: 'Highlights',
    tags: ["Chef's Pick", 'Signature', 'Popular', 'Best Seller', 'Must Try', 'New'],
  },
];

/** Tag that surfaces a dish in the guest “Signature Dishes” section. */
export const SIGNATURE_DISH_TAG = 'Signature';

export const SERVES_TAG_GROUP = DIETARY_TAG_GROUPS.find((group) => group.label === 'Serves');
export const SERVES_TAG_PRESETS = SERVES_TAG_GROUP?.tags || [];

export const DIETARY_TAG_PRESETS = DIETARY_TAG_GROUPS.flatMap((group) => group.tags);

export function isServesTag(tag) {
  return /^serves\s+\d/i.test(String(tag || '').trim());
}

/** Active portion/serves tag from dietaryTags (at most one expected). */
export function getServesTag(dietaryTags = []) {
  const fromList = (dietaryTags || []).find((tag) => isServesTag(tag));
  return fromList || null;
}

export function splitDietaryAndServesTags(dietaryTags = []) {
  const dietary = [];
  const serves = [];
  for (const tag of dietaryTags || []) {
    if (isServesTag(tag)) serves.push(tag);
    else dietary.push(tag);
  }
  return { dietary, serves };
}

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
