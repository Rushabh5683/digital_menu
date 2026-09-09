function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .trim();
}

export function dishMatchesQuery(dish, query) {
  const q = normalize(query);
  if (!q) return true;

  const haystack = [
    dish.name,
    dish.description,
    ...(dish.ingredients || []),
    ...(dish.dietaryTags || []),
  ]
    .map(normalize)
    .join(' ');

  return haystack.includes(q);
}

/** Canonical filter chips shown in the guest filter sheet */
export const GUEST_FILTER_PRESETS = [
  { id: 'veg', label: 'Veg', match: ['veg', 'vegetarian'] },
  { id: 'vegan', label: 'Vegan', match: ['vegan'] },
  { id: 'jain', label: 'Jain', match: ['jain'] },
  { id: 'spicy', label: 'Spicy', match: ['spicy', 'hot'] },
  { id: 'gluten-free', label: 'Gluten free', match: ['gluten-free', 'gluten free'] },
  { id: 'bestseller', label: 'Bestseller', match: ['bestseller', 'best-seller', 'must-try', 'must try'] },
];

export function filterMenuCategories(categories, query, dietaryFilters = []) {
  const filters = (dietaryFilters || []).map(normalize).filter(Boolean);
  const hasQuery = Boolean(normalize(query));

  if (!hasQuery && filters.length === 0) {
    return categories;
  }

  return categories
    .map((category) => ({
      ...category,
      dishes: category.dishes.filter((dish) => {
        if (!dishMatchesQuery(dish, query)) return false;
        if (filters.length === 0) return true;
        const tags = (dish.dietaryTags || []).map(normalize);
        const nameBlob = normalize(`${dish.name} ${dish.description || ''}`);
        return filters.every((filter) => {
          const preset = GUEST_FILTER_PRESETS.find(
            (item) => item.id === filter || normalize(item.label) === filter,
          );
          const needles = preset?.match || [filter];
          return needles.some(
            (needle) => tags.some((tag) => tag.includes(needle)) || nameBlob.includes(needle),
          );
        });
      }),
    }))
    .filter((category) => category.dishes.length > 0);
}

export function collectDietaryTags(categories) {
  const seen = new Set();
  const tags = [];
  for (const category of categories || []) {
    for (const dish of category.dishes || []) {
      for (const tag of dish.dietaryTags || []) {
        const key = normalize(tag);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        tags.push(tag);
      }
    }
  }
  return tags.sort((a, b) => String(a).localeCompare(String(b)));
}

export function getDishDietType(dish) {
  const tags = (dish?.dietaryTags || []).map(normalize);
  if (tags.some((tag) => tag.includes('non-veg') || tag.includes('nonveg') || tag.includes('egg'))) {
    return 'non-veg';
  }
  if (tags.some((tag) => tag.includes('vegan'))) return 'vegan';
  if (tags.some((tag) => tag.includes('veg') || tag.includes('jain'))) return 'veg';
  return null;
}

export function getDishBadges(dish) {
  const tags = (dish?.dietaryTags || []).map(normalize);
  const badges = [];
  const push = (id, label, tone) => {
    if (badges.some((badge) => badge.id === id)) return;
    badges.push({ id, label, tone });
  };

  if (isChefPick(dish)) {
    push('chef-pick', "Chef's Pick", 'accent');
  }
  if (tags.some((tag) => /best|must.?try|popular/.test(tag))) {
    push('bestseller', 'Bestseller', 'accent');
  }
  if (tags.some((tag) => /new|fresh/.test(tag))) {
    push('new', 'New', 'ink');
  }
  if (tags.some((tag) => /spicy|hot|chilli|chili/.test(tag))) {
    push('spicy', 'Spicy', 'danger');
  }

  return badges.slice(0, 2);
}

/** True when admin tagged the dish as Chef's Pick (or legacy signature/chef tags). */
export function isChefPick(dish) {
  const tags = (dish?.dietaryTags || []).map(normalize);
  return tags.some((tag) =>
    /chef.?s?\s*pick|chef-pick|chefs?\s*special|^signature$|signature dish/.test(tag),
  );
}

export function getSpiceLevel(dish) {
  const tags = (dish?.dietaryTags || []).map(normalize);
  const blob = normalize(
    `${dish?.name || ''} ${dish?.description || ''} ${(dish?.ingredients || []).join(' ')}`,
  );
  if (tags.some((tag) => /extra.?spicy|very.?hot/.test(tag)) || /extra spicy/.test(blob)) {
    return 3;
  }
  if (tags.some((tag) => /spicy|hot|chilli|chili/.test(tag)) || /\bspicy\b|\bhot\b/.test(blob)) {
    return 2;
  }
  if (tags.some((tag) => /mild/.test(tag))) return 1;
  return 0;
}

export function categoryBlurb(category) {
  if (category?.description?.trim()) return category.description.trim();
  const name = normalize(category?.name);
  if (/starter|appetizer|soup/.test(name)) return 'Light bites to begin the meal';
  if (/bread|roti|naan/.test(name)) return 'Fresh from the tandoor';
  if (/rice|biryani|pulao/.test(name)) return 'Fragrant rice specialties';
  if (/dessert|sweet|mithai/.test(name)) return 'Something sweet to finish';
  if (/beverage|drink|mocktail|coffee|tea/.test(name)) return 'Refreshments and pours';
  if (/chinese|indo/.test(name)) return 'Bold wok-fired favourites';
  if (/main|curry|veg|non.?veg/.test(name)) return 'Rich, comforting classics';
  if (/recommend|chef|special|popular/.test(name)) return 'Guest favourites right now';
  return 'From the kitchen';
}

export function formatPrice(price) {
  const value = Number(price);
  if (Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function categoryDomId(categoryId) {
  return `category-${categoryId}`;
}

export function formatDietaryTag(tag) {
  return String(tag)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getMenuStats(categories) {
  let dishCount = 0;
  const categoryCount = (categories || []).length;
  for (const category of categories || []) {
    dishCount += category.dishes?.length || 0;
  }
  return { categoryCount, dishCount };
}
