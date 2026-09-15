import { DIETARY_TAG_PRESETS } from '../../../../shared/constants/dietaryTags.js';
import { resolveMediaUrl } from '../../../../shared/lib/mediaUrl.js';

const SPICE_LABELS = ['No spice', 'Mild', 'Medium', 'Hot'];

function tagKey(tag) {
  return String(tag || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

const PRESET_BY_KEY = new Map(DIETARY_TAG_PRESETS.map((tag) => [tagKey(tag), tag]));

/** Legacy seed / slug values → current admin preset labels */
const TAG_ALIASES = {
  veg: 'Vegetarian',
  nonveg: 'Non-Vegetarian',
  nonvegetarian: 'Non-Vegetarian',
  chefspick: "Chef's Pick",
  chefspicks: "Chef's Pick",
  chefspecial: "Chef's Pick",
  bestseller: 'Best Seller',
  musttry: 'Must Try',
  signaturedish: 'Signature',
};

const TASTE_WORDS = [
  'Smoky', 'Creamy', 'Spiced', 'Tangy', 'Sweet', 'Savory', 'Rich', 'Aromatic',
  'Charred', 'Mild', 'Bold', 'Fresh', 'Earthy', 'Buttery', 'Zesty', 'Herbal',
  'Umami', 'Comforting', 'Velvety', 'Crisp', 'Tender', 'Fragrant', 'Nutty',
  'Citrus', 'Peppery', 'Silky', 'Warm', 'Delicate',
];

const TEXTURE_WORDS = [
  'Crisp', 'Tender', 'Silky', 'Juicy', 'Flaky', 'Creamy', 'Crunchy',
  'Charred', 'Succulent', 'Soft', 'Firm', 'Velvety', 'Light',
];

const PLACEHOLDER_GRADIENT =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#E8DFD3"/><stop offset="100%" stop-color="#C5A880"/>
      </linearGradient></defs>
      <rect width="800" height="500" fill="url(#g)"/>
      <text x="400" y="260" text-anchor="middle" fill="#785E39" font-family="Georgia,serif" font-size="28">Dish</text>
    </svg>`,
  );

function blob(dish) {
  const ingredients = Array.isArray(dish.ingredients)
    ? dish.ingredients.map((i) => (typeof i === 'string' ? i : i?.name || '')).join(' ')
    : '';
  const tags = (dish.dietaryTags || []).join(' ');
  return `${dish.name || ''} ${dish.description || ''} ${ingredients} ${tags} ${dish.categoryName || ''}`.toLowerCase();
}

function normalizeTag(tag) {
  const t = String(tag || '').trim();
  if (!t) return null;
  const key = tagKey(t);
  if (PRESET_BY_KEY.has(key)) return PRESET_BY_KEY.get(key);
  if (TAG_ALIASES[key]) return TAG_ALIASES[key];
  // Keep admin/custom wording as saved — do not title-case (breaks Chef's Pick).
  return t;
}

function inferSpiceLevel(dish, text) {
  if (/extra.?spicy|very.?hot|fiery|chilli bomb|chili bomb/.test(text)) return 3;
  if (/\bhot\b|spicy|chilli|chili|pepper heat|chettinad/.test(text)) return 2;
  if (/mild|gentle spice|lightly spiced|aromatic spice/.test(text)) return 1;
  const tags = (dish.dietaryTags || []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => /extra.?spicy|very.?hot|fiery/.test(t))) return 3;
  if (tags.some((t) => /spicy|hot|chilli|chili/.test(t))) return 2;
  if (tags.some((t) => /mild/.test(t))) return 1;
  return 0;
}

function inferRichness(dish, text) {
  if (/light|salad|crudo|broth|soup|starter|fresh|clean|grilled salad/.test(text)) {
    if (/cream|butter|makhani|biryani|rich|indulgent/.test(text)) return 'Medium';
    return 'Light';
  }
  if (/creamy|butter|makhani|biryani|rich|indulgent|handi|gravy|dal|curry|slow.?cook/.test(text)) {
    return 'Rich';
  }
  const cat = String(dish.categoryName || dish.category || '').toLowerCase();
  if (/starter|appetizer|salad|beverage|drink/.test(cat)) return 'Light';
  if (/main|biryani|curry|grill/.test(cat)) return 'Rich';
  return 'Medium';
}

function pickWords(corpus, dictionary, limit = 3) {
  const found = [];
  for (const word of dictionary) {
    if (corpus.includes(word.toLowerCase()) && !found.includes(word)) {
      found.push(word);
    }
    if (found.length >= limit) break;
  }
  return found;
}

function inferTasteProfile(dish, text) {
  const fromDesc = pickWords(text, TASTE_WORDS, 3);
  if (fromDesc.length >= 2) return fromDesc.slice(0, 3);

  const defaults = [];
  if (/smok|char|tandoor|grill/.test(text)) defaults.push('Smoky');
  if (/cream|butter|makhani|malai/.test(text)) defaults.push('Creamy');
  if (/spice|masala|chilli|chili/.test(text)) defaults.push('Spiced');
  if (/fresh|herb|mint|coriander|lemon|lime/.test(text)) defaults.push('Fresh');
  if (/sweet|dessert|kulfi|gulab/.test(text)) defaults.push('Sweet');
  if (defaults.length === 0) defaults.push('Aromatic', 'Savory');
  while (defaults.length < 2) defaults.push('Fragrant');
  return defaults.slice(0, 3);
}

function inferTexture(dish, text) {
  const found = pickWords(text, TEXTURE_WORDS, 3);
  if (found.length >= 2) return found;
  if (/crisp|fry|fried|crunch/.test(text)) return ['Crisp', 'Light'];
  if (/grill|tandoor|char/.test(text)) return ['Charred', 'Tender'];
  if (/cream|curry|sauce|dal/.test(text)) return ['Silky', 'Velvety'];
  if (/bread|naan|roti/.test(text)) return ['Soft', 'Flaky'];
  return ['Tender', 'Succulent'];
}

function inferPortion(dish, text) {
  const serveTag = (dish.dietaryTags || []).find((tag) =>
    /^serves\s+\d/i.test(String(tag || '').trim()),
  );
  if (serveTag) {
    const match = String(serveTag).match(/serves\s+(\d+)/i);
    const n = match ? Number(match[1]) : 0;
    if (n >= 5) return 'Best shared';
    if (n >= 2) return 'Good for 2';
    return 'Individual';
  }
  if (/platter|share|sharing|family|feast|for (the )?table|good for (two|2)|serves 2|serves two/.test(text)) {
    if (/platter|feast|family|sharing platter/.test(text)) return 'Best shared';
    return 'Good for 2';
  }
  const cat = String(dish.categoryName || '').toLowerCase();
  if (/biryani|platter|feast/.test(cat)) return 'Good for 2';
  if (/main|curry/.test(cat)) return 'Individual';
  return 'Individual';
}

function inferPreparation(dish, text) {
  if (/tandoor|clay oven/.test(text)) return 'Clay Tandoor Roast';
  if (/woodfire|charcoal|ember|angara/.test(text)) return 'Woodfire Charcoal Grill';
  if (/dum|sealed|handi/.test(text)) return 'Slow Dum Cooking';
  if (/simmer|slow.?cook|brais/.test(text)) return 'Slow Simmered';
  if (/steam/.test(text)) return 'Gently Steamed';
  if (/fry|fried|crisp/.test(text)) return 'Crisp Finished';
  if (/raw|crudo|ceviche/.test(text)) return 'Fresh Preparation';
  if (/bake|oven/.test(text)) return 'Oven Baked';
  const cat = String(dish.categoryName || '').toLowerCase();
  if (/grill|tandoor/.test(cat)) return 'Charcoal Grilled';
  if (/dessert/.test(cat)) return 'House Confection';
  if (/beverage|drink/.test(cat)) return 'Freshly Prepared';
  return 'Kitchen Prepared';
}

function normalizeIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  return ingredients
    .map((item) => {
      if (typeof item === 'string') {
        const name = item.trim();
        return name ? { name } : null;
      }
      if (item && typeof item === 'object' && item.name) {
        return { name: String(item.name).trim(), note: item.note };
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeDietaryTags(tags) {
  const out = [];
  const seen = new Set();
  for (const raw of tags || []) {
    const tag = normalizeTag(raw);
    if (!tag) continue;
    const key = tagKey(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

function flagFromTags(tags, patterns) {
  return (tags || []).some((t) => patterns.test(String(t).toLowerCase()));
}

function sameCategoryId(a, b) {
  const left = a?.categoryId || a?.category || null;
  const right = b?.categoryId || b?.category || null;
  if (!left || !right) return false;
  return String(left) === String(right);
}

function computeSimilarDishIds(dish, allDishes) {
  if (!Array.isArray(allDishes) || allDishes.length === 0) return [];

  const tagSet = new Set((dish.dietaryTags || []).map((t) => String(t).toLowerCase()));
  const catId = dish.categoryId || dish.category;
  if (!catId) return [];

  const scored = allDishes
    .filter(
      (d) =>
        d.id !== dish.id &&
        sameCategoryId(dish, d) &&
        d.availability !== false &&
        d.isAvailable !== false,
    )
    .map((other) => {
      let score = 10; // same category is required — start with a base score
      const otherTags = (other.dietaryTags || []).map((t) => String(t).toLowerCase());
      for (const t of otherTags) {
        if (tagSet.has(t)) score += 12;
      }
      if (other.isPopular || other.isChefRecommended) score += 5;
      return { id: other.id, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((x) => x.id);
}

/**
 * Enrich a live API dish with Arcadia-style sensory metadata.
 * Does not mutate the original dish object.
 */
export function enrichDish(dish, { category, popularIds, allDishes } = {}) {
  if (!dish) return null;

  const popularSet = new Set((popularIds || []).map(String));
  const categoryName = category?.name || dish.categoryName || '';
  const categoryId = category?.id || dish.categoryId || dish.category || '';
  const text = blob({ ...dish, categoryName });

  const spiceLevel = inferSpiceLevel(dish, text);
  const dietaryTags = normalizeDietaryTags(dish.dietaryTags);
  const ingredients = normalizeIngredients(dish.ingredients);

  const isPopular =
    popularSet.has(String(dish.id)) ||
    flagFromTags(dish.dietaryTags, /popular|best.?seller|bestseller|must.?try|guest.?fav/);
  const isChefRecommended = flagFromTags(
    dish.dietaryTags,
    /chef.?s?\s*pick|chef-pick|chefs?\s*special|chef.?recommend/,
  );
  const isSignature = flagFromTags(dish.dietaryTags, /^signature$|signature dish|house specialty/);

  const enriched = {
    ...dish,
    id: String(dish.id),
    name: dish.name || 'Untitled Dish',
    description: dish.description || '',
    price: Number(dish.price) || 0,
    imageUrl: resolveMediaUrl(dish.imageUrl || dish.image || '') || null,
    image: resolveMediaUrl(dish.imageUrl || dish.image || '') || PLACEHOLDER_GRADIENT,
    category: categoryId,
    categoryId,
    categoryName,
    spiceLevel,
    spiceLabel: SPICE_LABELS[spiceLevel] || 'No spice',
    richness: inferRichness(dish, text),
    tasteProfile: inferTasteProfile(dish, text),
    texture: inferTexture(dish, text),
    portion: inferPortion(dish, text),
    preparation: inferPreparation(dish, text),
    whatToExpect:
      (dish.description && dish.description.trim()) ||
      `A ${SPICE_LABELS[spiceLevel].toLowerCase()} ${inferRichness(dish, text).toLowerCase()} plate with carefully balanced aromatics.`,
    dietaryTags,
    ingredients,
    allergens: Array.isArray(dish.allergens) ? dish.allergens : [],
    isPopular,
    isChefRecommended,
    isSignature,
    availability: dish.isAvailable !== false && dish.availability !== false,
    isAvailable: dish.isAvailable !== false && dish.availability !== false,
    similarDishIds: [],
    pairingDishIds: dish.pairingDishIds || [],
    pairingBeverage: dish.pairingBeverage || null,
    searchKeywords: [
      dish.name,
      ...ingredients.map((i) => i.name),
      ...dietaryTags,
      categoryName,
    ]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase()),
    whyRelevantHint: dish.whyRelevantHint || null,
    suggestedAlternativeIds: dish.suggestedAlternativeIds || [],
    unavailableReason: dish.unavailableReason || null,
  };

  enriched.similarDishIds = computeSimilarDishIds(enriched, allDishes);
  return enriched;
}

/**
 * Enrich full menu categories from the live API.
 * Returns { categories, dishes }.
 */
export function enrichMenu(categories, { popularIds } = {}) {
  const flatRaw = [];
  for (const cat of categories || []) {
    for (const dish of cat.dishes || []) {
      flatRaw.push({ dish, category: cat });
    }
  }

  // First pass without similar ids (need full list)
  const preliminary = flatRaw.map(({ dish, category }) =>
    enrichDish(dish, { category, popularIds, allDishes: [] }),
  );

  const dishes = flatRaw.map(({ dish, category }, idx) =>
    enrichDish(dish, {
      category,
      popularIds,
      allDishes: preliminary,
    }),
  );

  // Rebuild category dish arrays with enriched dishes
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const enrichedCategories = (categories || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description || '',
    shortDescription: cat.description || cat.shortDescription || '',
    dishes: (cat.dishes || [])
      .map((d) => byId.get(String(d.id)))
      .filter(Boolean),
  }));

  return { categories: enrichedCategories, dishes };
}

/**
 * Mood pill matching (WelcomeSection moods).
 */
export function matchesMood(dish, moodId) {
  if (!moodId || !dish) return true;
  const cat = String(dish.category || dish.categoryName || '').toLowerCase();

  switch (moodId) {
    case 'light':
      return dish.richness === 'Light' || /starter|appetizer|salad/.test(cat);
    case 'filling':
      return dish.richness === 'Rich' || /main|biryani|rice|curry/.test(cat);
    case 'spicy':
      return (dish.spiceLevel || 0) >= 2;
    case 'vegetarian': {
      const tags = (dish.dietaryTags || []).map((t) => String(t).toLowerCase());
      if (tags.some((t) => /non[\s-]*veg|nonveg/.test(t))) return false;
      const name = String(dish.name || '').toLowerCase();
      if (/chicken|murgh|mutton|lamb|gosht|fish|prawn|keema|egg\b|butter\s*chicken/.test(name)) {
        return false;
      }
      if (/non[\s-]*veg|nonveg/.test(cat)) return false;
      return (
        tags.some((t) => t === 'vegetarian' || t === 'vegan' || t === 'veg' || t === 'jain') ||
        /\bveg(etarian)?\b|\bvegan\b|\bjain\b/.test(cat) ||
        /paneer|aloo|\bdal\b|gobi|palak|chole|rajma/.test(name)
      );
    }
    case 'chef':
      return Boolean(dish.isChefRecommended);
    case 'popular':
      return Boolean(dish.isPopular);
    default:
      return true;
  }
}

/**
 * Filter sheet matching — dietary + spice tags from the live menu only.
 * filters = { dietary[], spiceLevels[] (tag names: Mild/Spicy/Hot or legacy numbers) }
 */
export function matchesFilters(dish, filters = {}) {
  if (!dish) return false;
  const dietary = filters.dietary || [];
  const spiceLevels = filters.spiceLevels || [];
  const richness = filters.richness || [];
  const portion = filters.portion || [];
  const dishTags = (dish.dietaryTags || []).map((t) => String(t));

  if (dietary.length > 0) {
    const hasAll = dietary.every((tag) => dishTags.includes(tag));
    if (!hasAll) return false;
  }

  if (spiceLevels.length > 0) {
    const spiceTagMatch = spiceLevels.some(
      (s) => typeof s === 'string' && dishTags.includes(s),
    );
    const spiceLevelMatch = spiceLevels.some(
      (s) => typeof s === 'number' && s === (dish.spiceLevel ?? -1),
    );
    if (!spiceTagMatch && !spiceLevelMatch) return false;
  }

  // Legacy richness/portion filters (no longer shown in UI)
  if (richness.length > 0 && !richness.includes(dish.richness)) return false;
  if (portion.length > 0 && !portion.includes(dish.portion)) return false;
  return true;
}

export { PLACEHOLDER_GRADIENT };
