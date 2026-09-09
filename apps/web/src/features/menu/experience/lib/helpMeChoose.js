/**
 * Build Help Me Choose questions + score recommendations from THIS restaurant's menu.
 * No Arcadia/generic cuisine assumptions — options come from live dish data.
 */

function blob(dish) {
  const ingredients = Array.isArray(dish.ingredients)
    ? dish.ingredients.map((i) => (typeof i === 'string' ? i : i?.name || '')).join(' ')
    : '';
  const tags = (dish.dietaryTags || []).join(' ');
  return `${dish.name || ''} ${dish.description || ''} ${ingredients} ${tags} ${dish.categoryName || ''}`.toLowerCase();
}

function availableDishes(dishes = []) {
  return (dishes || []).filter((d) => d && d.availability !== false && d.isAvailable !== false);
}

function uniqueNames(list, limit = 3) {
  const seen = new Set();
  const out = [];
  for (const name of list) {
    const key = String(name || '').trim();
    if (!key || seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    out.push(key);
    if (out.length >= limit) break;
  }
  return out;
}

function formatList(names) {
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function categoryBuckets(dishes) {
  const buckets = new Map();
  for (const dish of dishes) {
    const id = dish.categoryId || dish.category || 'other';
    const name = dish.categoryName || 'Menu';
    if (!buckets.has(id)) {
      buckets.set(id, { id, name, dishes: [] });
    }
    buckets.get(id).dishes.push(dish);
  }
  return [...buckets.values()];
}

function isStarterLike(dish) {
  const cat = String(dish.categoryName || dish.category || '').toLowerCase();
  return /starter|appetizer|small plate|snack|soup|salad|tikk?i|chaat/.test(cat);
}

function isMainLike(dish) {
  const cat = String(dish.categoryName || dish.category || '').toLowerCase();
  return /main|curry|biryani|grill|tandoor|rice|course|entree|entrée/.test(cat) || (!isStarterLike(dish) && !isDessertLike(dish) && !isDrinkLike(dish));
}

function isDessertLike(dish) {
  const cat = String(dish.categoryName || dish.category || '').toLowerCase();
  return /dessert|sweet|mithai|ice cream|kulfi/.test(cat);
}

function isDrinkLike(dish) {
  const cat = String(dish.categoryName || dish.category || '').toLowerCase();
  return /beverage|drink|mocktail|cocktail|shake|lassi|tea|coffee|juice/.test(cat);
}

function isMeatDish(dish) {
  const nameDesc = `${dish.name || ''} ${dish.description || ''}`.toLowerCase();
  const ingredients = Array.isArray(dish.ingredients)
    ? dish.ingredients.map((i) => (typeof i === 'string' ? i : i?.name || '')).join(' ')
    : '';
  const tags = (dish.dietaryTags || []).map((t) => String(t).toLowerCase());
  const text = `${nameDesc} ${ingredients}`;

  if (tags.some((t) => /non[\s-]*veg|nonveg/.test(t))) return true;
  // Meat / egg signals in the dish itself (not category — "Non Veg" is handled via tags/name)
  return /chicken|murgh|\bmurg\b|mutton|lamb|gosht|keema|fish|prawn|shrimp|seafood|crab|pomfret|beef|pork|duck|egg\b|\banda\b|butter\s*chicken|chicken\s*sukka/.test(
    text,
  );
}

function hasExplicitVegTag(dish) {
  const tags = (dish.dietaryTags || []).map((t) => String(t).trim().toLowerCase());
  return tags.some((t) => {
    if (/non[\s-]*veg|nonveg/.test(t)) return false;
    // Exact-ish veg tags from admin presets / custom
    return (
      t === 'veg' ||
      t === 'vegetarian' ||
      t === 'vegan' ||
      t === 'jain' ||
      /^veg(etarian)?$/.test(t) ||
      /(^|[\s,/])veg(etarian)?($|[\s,/])/.test(t)
    );
  });
}

function isVegCategory(dish) {
  const cat = String(dish.categoryName || dish.category || '').toLowerCase();
  // "Non Veg Main Course" must NOT count as vegetarian
  if (/non[\s-]*veg|nonveg/.test(cat)) return false;
  return /\bveg(etarian)?\b|\bvegan\b|\bjain\b|plant[\s-]*based/.test(cat);
}

/** True vegetarian plate: never meat, and tagged veg OR clearly veg category / veggie name. */
function isVegDish(dish) {
  if (!dish || isMeatDish(dish)) return false;
  if (hasExplicitVegTag(dish)) return true;
  if (isVegCategory(dish)) return true;

  // Name-only veggie cues — still blocked if meat words present (isMeatDish)
  const name = String(dish.name || '').toLowerCase();
  return /paneer|aloo|dal\b|mushroom|gobi|palak|chole|rajma|malai\s*kofta|veg\b|vegetarian|vegan|tofu|jackfruit/.test(
    name,
  );
}

const PROTEIN_DETECTORS = [
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    // Strict: never include meat dishes; do not match bare "veg" inside "Non Veg"
    match: (dish) => isVegDish(dish),
  },
  {
    id: 'paneer',
    label: 'Paneer',
    match: (dish, text) => !isMeatDish(dish) && /paneer|cottage cheese/.test(text),
  },
  {
    id: 'chicken',
    label: 'Chicken',
    match: (dish, text) => /chicken|murgh|\bmurg\b/.test(`${dish.name || ''} ${text}`),
  },
  {
    id: 'mutton',
    label: 'Mutton / Lamb',
    match: (dish, text) => /mutton|lamb|gosht|keema/.test(`${dish.name || ''} ${text}`),
  },
  {
    id: 'seafood',
    label: 'Seafood',
    match: (dish, text) =>
      /fish|prawn|shrimp|seafood|crab|pomfret|scampi|squid/.test(`${dish.name || ''} ${text}`),
  },
  {
    id: 'egg',
    label: 'Egg',
    match: (dish, text) => /\begg\b|\banda\b/.test(`${dish.name || ''} ${text}`),
  },
];

/**
 * Analyze live menu → signals used to generate questions.
 * Pass `categories` from the restaurant menu to preserve admin order and list every section.
 */
export function analyzeMenuForGuidance(dishes = [], { restaurantName, categories: menuCategories, popularIds } = {}) {
  const live = availableDishes(dishes);
  const liveById = new Map(live.map((d) => [String(d.id), d]));

  let categories;
  if (Array.isArray(menuCategories) && menuCategories.length > 0) {
    categories = menuCategories
      .map((cat) => {
        const id = String(cat.id || cat.categoryId || 'other');
        const name = cat.name || 'Menu';
        const catDishes = (cat.dishes || [])
          .map((d) => liveById.get(String(d.id)))
          .filter(Boolean);
        // Also catch live dishes tagged with this category id but missing from nested array
        for (const dish of live) {
          if (String(dish.categoryId || dish.category) !== id) continue;
          if (!catDishes.some((d) => String(d.id) === String(dish.id))) catDishes.push(dish);
        }
        return { id, name, dishes: catDishes };
      })
      .filter((cat) => cat.dishes.length > 0);
  } else {
    categories = categoryBuckets(live);
  }

  // Any live dishes whose category wasn't in the menu list
  if (categories.length) {
    const known = new Set(categories.map((c) => String(c.id)));
    for (const bucket of categoryBuckets(live)) {
      if (known.has(String(bucket.id))) continue;
      categories.push(bucket);
    }
  }

  const categoryNames = categories.map((c) => c.name);

  const light = live.filter((d) => d.richness === 'Light' || isStarterLike(d));
  const rich = live.filter((d) => d.richness === 'Rich' || isMainLike(d));
  const creamy = live.filter(
    (d) =>
      /cream|butter|makhani|malai|cheese|gravy/.test(blob(d)) ||
      (d.tasteProfile || []).some((t) => /Creamy|Buttery|Velvety|Comforting/i.test(t)),
  );
  const spicy = live.filter((d) => (d.spiceLevel || 0) >= 2);
  const mild = live.filter((d) => (d.spiceLevel || 0) <= 1);
  const popular = live.filter((d) => d.isPopular);
  const chef = live.filter((d) => d.isChefRecommended || d.isSignature);
  const starters = live.filter(isStarterLike);
  const mains = live.filter(isMainLike);
  const desserts = live.filter(isDessertLike);

  const spiceLevelsPresent = [...new Set(live.map((d) => d.spiceLevel ?? 0))].sort((a, b) => a - b);

  const proteinOptions = [];
  for (const detector of PROTEIN_DETECTORS) {
    const matches = live.filter((d) => detector.match(d, blob(d)));
    // Vegetarian must stay meat-free even if category text is noisy
    const refined =
      detector.id === 'vegetarian' ? matches.filter((d) => isVegDish(d) && !isMeatDish(d)) : matches;
    if (refined.length === 0) continue;
    proteinOptions.push({
      id: detector.id,
      label: detector.label,
      dishes: refined,
      examples: uniqueNames(refined.map((d) => d.name), 3),
    });
  }

  return {
    restaurantName: restaurantName || 'our kitchen',
    live,
    categories,
    categoryNames,
    popularOrder: (popularIds || []).map(String),
    counts: {
      total: live.length,
      light: light.length,
      rich: rich.length,
      creamy: creamy.length,
      spicy: spicy.length,
      mild: mild.length,
      popular: popular.length,
      chef: chef.length,
      starters: starters.length,
      mains: mains.length,
      desserts: desserts.length,
    },
    pools: { light, rich, creamy, spicy, mild, popular, chef, starters, mains, desserts },
    spiceLevelsPresent,
    proteinOptions,
    sampleNames: {
      light: uniqueNames(light.map((d) => d.name)),
      rich: uniqueNames(rich.map((d) => d.name)),
      creamy: uniqueNames(creamy.map((d) => d.name)),
      spicy: uniqueNames(spicy.map((d) => d.name)),
      mild: uniqueNames(mild.map((d) => d.name)),
      popular: uniqueNames(popular.map((d) => d.name)),
      chef: uniqueNames(chef.map((d) => d.name)),
      starters: uniqueNames(starters.map((d) => d.name)),
      mains: uniqueNames(mains.map((d) => d.name)),
      categories: uniqueNames(categoryNames, 4),
    },
  };
}

function descFromExamples(examples, fallback) {
  if (examples?.length) return `Including ${formatList(examples)}`;
  return fallback;
}

/**
 * Narrow live dishes using answers collected so far.
 */
export function poolFromAnswers(analysis, answers = {}) {
  let pool = [...(analysis.live || [])];

  if (answers.categoryId && answers.categoryId !== 'all') {
    pool = pool.filter(
      (d) => String(d.categoryId || d.category) === String(answers.categoryId),
    );
  }

  if (answers.dietTag && answers.dietTag !== 'any') {
    const want = String(answers.dietTag).toLowerCase();
    pool = pool.filter((d) =>
      (d.dietaryTags || []).some((t) => String(t).toLowerCase() === want),
    );
  }

  if (answers.highlightTag && answers.highlightTag !== 'any') {
    const want = String(answers.highlightTag).toLowerCase();
    pool = pool.filter((d) =>
      (d.dietaryTags || []).some((t) => String(t).toLowerCase() === want),
    );
  }

  if (answers.mood === 'vegetarian') {
    pool = pool.filter((d) => isVegDish(d));
  } else if (answers.mood === 'nonveg') {
    pool = pool.filter((d) => isMeatDish(d));
  } else if (answers.mood === 'spicy') {
    pool = pool.filter(
      (d) =>
        (d.spiceLevel || 0) >= 2 ||
        (d.dietaryTags || []).some((t) => /spicy|hot/i.test(t)),
    );
  } else if (answers.mood === 'light') {
    const light = pool.filter((d) => d.richness === 'Light' || isStarterLike(d));
    if (light.length) pool = light;
  } else if (answers.mood === 'filling') {
    const filling = pool.filter((d) => d.richness === 'Rich' || isMainLike(d));
    if (filling.length) pool = filling;
  } else if (answers.mood === 'explore' || answers.mood === 'popular') {
    const popular = pool.filter(
      (d) => d.isPopular || d.isChefRecommended || d.isSignature,
    );
    if (popular.length) pool = popular;
  } else if (answers.mood === 'chef') {
    const chef = pool.filter((d) => d.isChefRecommended || d.isSignature);
    if (chef.length) pool = chef;
  }

  return pool;
}

/**
 * One-tap Help Me Choose: mood or category → dishes immediately (no follow-up questions).
 */
export function buildHelpMeChooseSteps(analysis) {
  const a = analysis;
  const steps = [];
  if (!a?.live?.length) return steps;

  const options = [];

  // Every live menu category — one tap shows that section
  for (const cat of a.categories || []) {
    options.push({
      id: `category:${cat.id}`,
      label: cat.name,
      desc: `${cat.dishes.length} dish${cat.dishes.length === 1 ? '' : 'es'}`,
      meta: { type: 'category', categoryId: cat.id },
    });
  }

  if (options.length === 0) return steps;

  steps.push({
    key: 'choice',
    title: 'What are you in the mood for?',
    subtitle: 'Tap a section — matching dishes show right away.',
    options,
  });

  return steps;
}

/** Turn a one-tap choice into scoring answers. */
export function answersFromHelpChoice(optionOrId) {
  const id = typeof optionOrId === 'object' ? optionOrId?.id : optionOrId;
  const meta = typeof optionOrId === 'object' ? optionOrId?.meta : null;
  if (!id) return {};

  if (meta?.type === 'category' || String(id).startsWith('category:')) {
    const categoryId = meta?.categoryId || String(id).replace(/^category:/, '');
    return { categoryId, mood: null };
  }

  return { mood: id };
}

function proteinMatches(dish, proteinId) {
  if (!proteinId || proteinId === 'anything') return true;
  const text = blob(dish);
  const detector = PROTEIN_DETECTORS.find((d) => d.id === proteinId);
  if (!detector) return true;
  if (proteinId === 'vegetarian') return isVegDish(dish) && !isMeatDish(dish);
  return Boolean(detector.match(dish, text));
}

/**
 * Score dishes for the guest’s answers using THIS menu only.
 * Pass `{ limit: null }` (or 0) to return every matching dish.
 */
export function getMenuAwareRecommendations(answers = {}, dishes = [], analysis = null, options = {}) {
  const live = availableDishes(dishes);
  const a = analysis || analyzeMenuForGuidance(live);
  const limit = options.limit === null || options.limit === 0 ? null : (options.limit ?? 3);

  // Prefer the narrowed pool (category + tags + interest); fall back to full menu
  let candidates = poolFromAnswers(a, answers);
  if (!candidates.length) candidates = live;

  const scored = candidates.map((dish) => {
    let score = 10;
    const reasons = [];
    const text = blob(dish);

    // Hard preference: chosen category
    if (answers.categoryId && answers.categoryId !== 'all') {
      if (String(dish.categoryId || dish.category) === String(answers.categoryId)) {
        score += 55;
        reasons.push(`From ${dish.categoryName || 'your chosen section'}`);
      } else {
        score -= 100;
      }
    }

    // Diet / highlight tags already applied in pool; still reward exact tag hits
    if (answers.dietTag && answers.dietTag !== 'any') {
      const want = String(answers.dietTag).toLowerCase();
      if ((dish.dietaryTags || []).some((t) => String(t).toLowerCase() === want)) {
        score += 40;
        reasons.push(`Tagged “${answers.dietTag}”`);
      } else {
        score -= 60;
      }
    }
    if (answers.highlightTag && answers.highlightTag !== 'any') {
      const want = String(answers.highlightTag).toLowerCase();
      if ((dish.dietaryTags || []).some((t) => String(t).toLowerCase() === want)) {
        score += 35;
        reasons.push(`Kitchen highlight: ${answers.highlightTag}`);
      } else {
        score -= 40;
      }
    }

    // Mood
    switch (answers.mood) {
      case 'light':
        if (dish.richness === 'Light' || isStarterLike(dish)) {
          score += 40;
          reasons.push(`A lighter pick from ${dish.categoryName || 'the menu'}`);
        }
        break;
      case 'filling':
        if (dish.richness === 'Rich' || isMainLike(dish)) {
          score += 40;
          reasons.push(`A filling ${dish.categoryName || 'main'} from this kitchen`);
        }
        break;
      case 'comforting':
        if (/cream|butter|makhani|malai|gravy|cheese/.test(text)) {
          score += 40;
          reasons.push('Creamy / comforting profile on this menu');
        }
        break;
      case 'spicy':
        if ((dish.spiceLevel || 0) >= 2) {
          score += 45;
          reasons.push(`${dish.spiceLabel || 'Spicy'} heat from ${a.restaurantName}`);
        } else {
          score -= 25;
        }
        break;
      case 'vegetarian':
        if (isVegDish(dish)) {
          score += 45;
          reasons.push('Vegetarian match from this menu');
        } else {
          score -= 80;
        }
        break;
      case 'nonveg':
        if (isMeatDish(dish)) {
          score += 45;
          reasons.push('Non-veg match from this menu');
        } else {
          score -= 80;
        }
        break;
      case 'popular':
        if (dish.isPopular || dish.isChefRecommended || dish.isSignature) {
          score += 45;
          reasons.push(
            dish.isPopular
              ? 'Popular with guests at this restaurant'
              : "Highlighted by this restaurant's kitchen",
          );
        }
        break;
      case 'chef':
        if (dish.isChefRecommended || dish.isSignature) {
          score += 45;
          reasons.push("Highlighted by this restaurant's kitchen");
        }
        break;
      case 'explore':
      case 'anything': {
        const order = a.popularOrder || [];
        const rank = order.indexOf(String(dish.id));
        if (rank >= 0) {
          score += 120 - rank;
          reasons.push('Among the most ordered here');
        } else if (dish.isPopular) {
          score += 50;
          reasons.push('Popular with guests at this restaurant');
        } else if (dish.isChefRecommended || dish.isSignature) {
          score += 25;
          reasons.push("Kitchen highlight");
        } else {
          score += 10;
        }
        break;
      }
      default:
        break;
    }

    // Spice (levels + admin spice tags)
    const spiceAns = answers.spice;
    if (spiceAns && spiceAns !== 'any') {
      if (String(spiceAns).startsWith('tag:')) {
        const tag = String(spiceAns).slice(4).toLowerCase();
        if ((dish.dietaryTags || []).some((t) => String(t).toLowerCase() === tag)) {
          score += 40;
          reasons.push(`Tagged “${spiceAns.slice(4)}”`);
        } else {
          score -= 35;
        }
      } else if (spiceAns === 'none') {
        if ((dish.spiceLevel || 0) === 0) {
          score += 35;
          reasons.push('No sharp spice');
        } else if ((dish.spiceLevel || 0) > 1) score -= 40;
      } else if (spiceAns === 'mild') {
        if ((dish.spiceLevel || 0) <= 1) {
          score += 35;
          reasons.push('Mild on this menu');
        } else if ((dish.spiceLevel || 0) >= 3) score -= 30;
      } else if (spiceAns === 'medium') {
        if ((dish.spiceLevel || 0) >= 2) {
          score += 35;
          reasons.push('Clear spice warmth');
        }
      } else if (spiceAns === 'hot') {
        if ((dish.spiceLevel || 0) >= 3) {
          score += 45;
          reasons.push('Among the hotter dishes here');
        } else if ((dish.spiceLevel || 0) >= 2) score += 20;
        else score -= 20;
      }
    }

    // Protein
    if (answers.protein && answers.protein !== 'anything') {
      if (proteinMatches(dish, answers.protein)) {
        score += 50;
        const label = PROTEIN_DETECTORS.find((d) => d.id === answers.protein)?.label || answers.protein;
        reasons.push(`Matches your ${label.toLowerCase()} preference`);
      } else {
        score -= 80;
      }
    }

    // Hunger
    if (answers.hunger === 'little') {
      if (isStarterLike(dish) || dish.richness === 'Light') {
        score += 25;
        reasons.push(dish.categoryName ? `From ${dish.categoryName}` : 'Lighter portion style');
      } else if (isMainLike(dish) && dish.richness === 'Rich') score -= 15;
    } else if (answers.hunger === 'hungry') {
      if (
        isMainLike(dish) ||
        dish.richness === 'Rich' ||
        dish.portion === 'Best shared' ||
        dish.portion === 'Good for 2'
      ) {
        score += 25;
        reasons.push(dish.categoryName ? `Hearty ${dish.categoryName}` : 'Bigger appetite match');
      }
    } else if (answers.hunger === 'normal') {
      if (isMainLike(dish) || (!isDrinkLike(dish) && !isDessertLike(dish))) score += 12;
    }

    // Soft boosts from menu signals
    if (dish.isPopular) score += 8;
    if (dish.isChefRecommended) score += 6;

    const taste = (dish.tasteProfile || []).slice(0, 2).join(' and ');
    const explanation = reasons[0]
      ? `${taste ? `${taste} — ` : ''}${reasons[0]}`
      : `${taste || 'A solid match'} from ${dish.categoryName || a.restaurantName}`;

    return { dish, score, explanation, categoryName: dish.categoryName };
  });

  const ranked = scored
    .filter((row) => row.score > 0)
    .sort((x, y) => y.score - x.score || String(x.dish.name).localeCompare(String(y.dish.name)));

  const top = limit == null ? ranked : ranked.slice(0, limit);

  // If filters were too strict, fall back to best available on this menu
  if (top.length === 0) {
    const fallback = scored.sort((x, y) => y.score - x.score);
    const slice = limit == null ? fallback : fallback.slice(0, limit || 3);
    return slice.map((row) => ({
      dish: row.dish,
      explanation:
        row.explanation ||
        `Available tonight in ${row.dish.categoryName || a.restaurantName}`,
    }));
  }

  return top.map((row) => ({ dish: row.dish, explanation: row.explanation }));
}

/** Human-readable summary of answers for the results screen. */
export function summarizeGuidanceAnswers(answers = {}, analysis = null) {
  const parts = [];
  if (answers.mood === 'explore') {
    parts.push('most ordered');
  } else if (answers.mood && answers.mood !== 'anything') {
    parts.push(answers.mood);
  }
  if (answers.categoryId && answers.categoryId !== 'all' && analysis?.categories) {
    const cat = analysis.categories.find((c) => String(c.id) === String(answers.categoryId));
    if (cat?.name) parts.push(cat.name);
  } else if (answers.categoryId === 'all') {
    parts.push('all sections');
  }
  if (answers.dietTag && answers.dietTag !== 'any') parts.push(answers.dietTag);
  if (answers.highlightTag && answers.highlightTag !== 'any') parts.push(answers.highlightTag);
  if (answers.spice && answers.spice !== 'any') {
    parts.push(String(answers.spice).startsWith('tag:') ? answers.spice.slice(4) : answers.spice);
  }
  if (answers.protein && answers.protein !== 'anything') parts.push(answers.protein);
  if (answers.hunger) parts.push(answers.hunger);
  return parts.join(' · ');
}

export function defaultAnswersFromSteps(steps = []) {
  const answers = {};
  for (const step of steps) {
    answers[step.key] = step.options?.[0]?.id || null;
  }
  return answers;
}
