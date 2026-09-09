/**
 * Guided Menu Concierge flow driven by THIS restaurant's categories + admin dietary tags.
 * Questions are generated only from tags/categories that exist on live dishes.
 */

function availableDishes(dishes = []) {
  return (dishes || []).filter((d) => d && d.availability !== false && d.isAvailable !== false);
}

function normalizeTag(tag) {
  return String(tag || '').trim();
}

function tagKey(tag) {
  return normalizeTag(tag).toLowerCase();
}

function dishHasTag(dish, tag) {
  const want = tagKey(tag);
  return (dish.dietaryTags || []).some((t) => tagKey(t) === want || tagKey(t).includes(want));
}

function uniqueById(list) {
  const seen = new Set();
  return list.filter((d) => {
    if (!d?.id || seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
}

function categoryBuckets(dishes) {
  const map = new Map();
  for (const dish of dishes) {
    const id = String(dish.categoryId || dish.category || 'other');
    const name = dish.categoryName || 'Menu';
    if (!map.has(id)) map.set(id, { id, name, dishes: [] });
    map.get(id).dishes.push(dish);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Collect admin tags actually used on the live menu, with dish counts. */
function collectAdminTags(dishes) {
  const map = new Map();
  for (const dish of dishes) {
    for (const raw of dish.dietaryTags || []) {
      const tag = normalizeTag(raw);
      if (!tag) continue;
      const key = tagKey(tag);
      if (!map.has(key)) {
        map.set(key, { tag, key, dishes: [], count: 0 });
      }
      const entry = map.get(key);
      if (!entry.dishes.some((d) => d.id === dish.id)) {
        entry.dishes.push(dish);
        entry.count += 1;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function isSpiceTag(tag) {
  return /spicy|hot|chilli|chili|mild/.test(tagKey(tag));
}

function isDietPreferenceTag(tag) {
  const k = tagKey(tag);
  if (/non[\s-]*veg|nonveg/.test(k)) return true; // still a diet filter (non-veg)
  // Avoid matching the letters "veg" inside unrelated words; allow veg/vegetarian/vegan/jain
  return (
    /\bveg(etarian)?\b/.test(k) ||
    /\bvegan\b/.test(k) ||
    /\bjain\b/.test(k) ||
    /gluten|dairy|nut.?free|halal|egg.?free|keto/.test(k)
  );
}

function isHighlightTag(tag) {
  const k = tagKey(tag);
  return /chef|signature|popular|best.?seller|must.?try|special|new/.test(k);
}

/**
 * Analyze menu for concierge questioning.
 */
export function analyzeMenuForConcierge(dishes = [], { restaurantName } = {}) {
  const live = availableDishes(dishes);
  const categories = categoryBuckets(live);
  const tags = collectAdminTags(live);

  return {
    restaurantName: restaurantName || 'our kitchen',
    live,
    categories,
    tags,
    dietTags: tags.filter((t) => isDietPreferenceTag(t.tag)),
    spiceTags: tags.filter((t) => isSpiceTag(t.tag)),
    highlightTags: tags.filter((t) => isHighlightTag(t.tag)),
    otherTags: tags.filter(
      (t) => !isDietPreferenceTag(t.tag) && !isSpiceTag(t.tag) && !isHighlightTag(t.tag),
    ),
  };
}

function filterPool(pool, answers) {
  let next = [...pool];

  if (answers.categoryId && answers.categoryId !== 'all') {
    next = next.filter(
      (d) => String(d.categoryId || d.category) === String(answers.categoryId),
    );
  }

  if (answers.dietTag && answers.dietTag !== 'any') {
    next = next.filter((d) => dishHasTag(d, answers.dietTag));
  }

  if (answers.highlightTag && answers.highlightTag !== 'any') {
    next = next.filter((d) => dishHasTag(d, answers.highlightTag));
  }

  if (answers.spiceTag && answers.spiceTag !== 'any') {
    next = next.filter((d) => dishHasTag(d, answers.spiceTag));
  }

  if (answers.extraTag && answers.extraTag !== 'any') {
    next = next.filter((d) => dishHasTag(d, answers.extraTag));
  }

  return uniqueById(next);
}

/**
 * Build ordered guided questions from categories + admin tags.
 * Always ends with a final recommendation step once answers are complete.
 */
export function buildConciergeSteps(analysis) {
  const steps = [];
  const { restaurantName, categories, dietTags, spiceTags, highlightTags, otherTags, live } =
    analysis;

  if (!live.length) {
    return [
      {
        id: 'empty',
        key: 'done',
        kind: 'final',
        question: `I don’t see available dishes for ${restaurantName} right now.`,
        subtitle: 'Ask the restaurant to publish menu items and tags.',
        options: [],
      },
    ];
  }

  // 1) Category course (differentiate sections admin created)
  if (categories.length >= 2) {
    steps.push({
      id: 'category',
      key: 'categoryId',
      kind: 'category',
      question: `Which part of ${restaurantName}'s menu should we explore?`,
      subtitle: 'These are the categories set up for this restaurant.',
      options: [
        ...categories.map((cat) => ({
          id: cat.id,
          label: cat.name,
          desc: `${cat.dishes.length} dish${cat.dishes.length === 1 ? '' : 'es'} in this section`,
          meta: { type: 'category', categoryName: cat.name },
        })),
        {
          id: 'all',
          label: 'Entire menu',
          desc: `Search across all ${live.length} available dishes`,
          meta: { type: 'category', categoryName: 'All' },
        },
      ],
    });
  } else if (categories.length === 1) {
    // Auto-answer later; still useful as confirmation if many dishes
    if (categories[0].dishes.length >= 4) {
      steps.push({
        id: 'category',
        key: 'categoryId',
        kind: 'category',
        question: `You’re browsing ${categories[0].name}. Stay here or open everything?`,
        subtitle: 'Category created by the restaurant admin.',
        options: [
          {
            id: categories[0].id,
            label: categories[0].name,
            desc: `${categories[0].dishes.length} dishes in this category`,
            meta: { type: 'category', categoryName: categories[0].name },
          },
          {
            id: 'all',
            label: 'Show whole menu',
            desc: `${live.length} available dishes`,
            meta: { type: 'category', categoryName: 'All' },
          },
        ],
      });
    }
  }

  // 2) Dietary tags from admin (veg / vegan / gluten-free / etc.)
  if (dietTags.length > 0) {
    steps.push({
      id: 'diet',
      key: 'dietTag',
      kind: 'tag',
      question: 'Any dietary preference from the tags on this menu?',
      subtitle: 'Only tags the restaurant admin assigned to dishes are listed.',
      options: [
        ...dietTags.map((t) => ({
          id: t.tag,
          label: t.tag,
          desc: `${t.count} dish${t.count === 1 ? '' : 'es'} tagged “${t.tag}”`,
          meta: { type: 'tag', tag: t.tag },
        })),
        {
          id: 'any',
          label: 'No dietary filter',
          desc: 'Keep every dish in the section you chose',
          meta: { type: 'tag', tag: null },
        },
      ],
    });
  }

  // 3) Highlight tags (Chef's Pick, popular, signature, spicy as style)
  const styleTags = [...highlightTags];
  // Include Spicy here only if not already covered as diet — usually spice is separate
  if (styleTags.length > 0) {
    steps.push({
      id: 'highlight',
      key: 'highlightTag',
      kind: 'tag',
      question: 'Want dishes the kitchen highlighted?',
      subtitle: 'Based on special tags like Chef’s Pick or bestsellers on this menu.',
      options: [
        ...styleTags.map((t) => ({
          id: t.tag,
          label: t.tag,
          desc: `${t.count} dish${t.count === 1 ? '' : 'es'} tagged “${t.tag}”`,
          meta: { type: 'tag', tag: t.tag },
        })),
        {
          id: 'any',
          label: 'No special tag',
          desc: 'Any dish that matches your earlier answers',
          meta: { type: 'tag', tag: null },
        },
      ],
    });
  }

  // 4) Spice tags if admin used them
  if (spiceTags.length > 0) {
    steps.push({
      id: 'spice',
      key: 'spiceTag',
      kind: 'tag',
      question: 'How about spice, using this restaurant’s tags?',
      subtitle: 'Spice labels come from tags on individual dishes.',
      options: [
        ...spiceTags.map((t) => ({
          id: t.tag,
          label: t.tag,
          desc: `${t.count} dish${t.count === 1 ? '' : 'es'} tagged “${t.tag}”`,
          meta: { type: 'tag', tag: t.tag },
        })),
        {
          id: 'any',
          label: 'Either is fine',
          desc: 'Don’t filter by spice tags',
          meta: { type: 'tag', tag: null },
        },
      ],
    });
  }

  // 5) Remaining custom admin tags (e.g. Jain, Must try) not already asked
  const usedKeys = new Set([
    ...dietTags.map((t) => t.key),
    ...highlightTags.map((t) => t.key),
    ...spiceTags.map((t) => t.key),
  ]);
  const extras = otherTags.filter((t) => !usedKeys.has(t.key) && t.count > 0);
  if (extras.length > 0) {
    steps.push({
      id: 'extra',
      key: 'extraTag',
      kind: 'tag',
      question: 'One more filter from tags on this menu?',
      subtitle: 'Custom tags added by the restaurant admin.',
      options: [
        ...extras.slice(0, 6).map((t) => ({
          id: t.tag,
          label: t.tag,
          desc: `${t.count} dish${t.count === 1 ? '' : 'es'} tagged “${t.tag}”`,
          meta: { type: 'tag', tag: t.tag },
        })),
        {
          id: 'any',
          label: 'Skip',
          desc: 'Recommend from what we already narrowed',
          meta: { type: 'tag', tag: null },
        },
      ],
    });
  }

  // If we somehow have no filter questions, ask a simple popular vs all
  if (steps.length === 0) {
    steps.push({
      id: 'simple',
      key: 'highlightTag',
      kind: 'tag',
      question: `What should I recommend from ${restaurantName}?`,
      subtitle: 'We’ll pick from available dishes on tonight’s menu.',
      options: [
        {
          id: 'any',
          label: 'Best overall matches',
          desc: `${live.length} dishes available`,
          meta: { type: 'tag', tag: null },
        },
      ],
    });
  }

  return steps;
}

/**
 * Rank final dishes for the completed answer set.
 */
export function getConciergeRecommendations(answers, dishes = [], analysis = null) {
  const a = analysis || analyzeMenuForConcierge(dishes);
  let pool = filterPool(a.live, answers);

  // Soften if too strict
  if (pool.length === 0) {
    pool = filterPool(a.live, {
      ...answers,
      extraTag: 'any',
      spiceTag: answers.spiceTag || 'any',
    });
  }
  if (pool.length === 0) {
    pool = filterPool(a.live, {
      categoryId: answers.categoryId || 'all',
      dietTag: answers.dietTag || 'any',
      highlightTag: 'any',
      spiceTag: 'any',
      extraTag: 'any',
    });
  }
  if (pool.length === 0) pool = a.live;

  const scored = pool.map((dish) => {
    let score = 10;
    const reasons = [];

    if (answers.categoryId && answers.categoryId !== 'all') {
      if (String(dish.categoryId || dish.category) === String(answers.categoryId)) {
        score += 25;
        reasons.push(`From ${dish.categoryName || 'your chosen category'}`);
      }
    }

    for (const key of ['dietTag', 'highlightTag', 'spiceTag', 'extraTag']) {
      const tag = answers[key];
      if (tag && tag !== 'any' && dishHasTag(dish, tag)) {
        score += 30;
        reasons.push(`Tagged “${tag}” by the restaurant`);
      }
    }

    if (dish.isPopular) score += 8;
    if (dish.isChefRecommended) score += 10;
    if (dish.isSignature) score += 6;

    const matchedTags = (dish.dietaryTags || []).slice(0, 3);
    const explanation =
      reasons[0] ||
      (matchedTags.length
        ? `Tagged ${matchedTags.map((t) => `“${t}”`).join(', ')} · ${dish.categoryName || a.restaurantName}`
        : `From ${dish.categoryName || a.restaurantName}`);

    return { dish, score, explanation };
  });

  return scored
    .sort((x, y) => y.score - x.score || String(x.dish.name).localeCompare(String(y.dish.name)))
    .slice(0, 3)
    .map((row) => ({ dish: row.dish, explanation: row.explanation }));
}

export function buildConciergeGreeting(analysis) {
  const { restaurantName, categories, tags, live } = analysis;
  const catNames = categories.map((c) => c.name).slice(0, 4);
  const tagNames = tags.map((t) => t.tag).slice(0, 5);

  const catPart =
    catNames.length > 0
      ? ` We can walk section by section through ${catNames.join(', ')}${categories.length > 4 ? ', and more' : ''}.`
      : '';
  const tagPart =
    tagNames.length > 0
      ? ` I’ll only use dietary tags your kitchen set — like ${tagNames.join(', ')}.`
      : ' I’ll guide you using the dishes available tonight.';

  return {
    text: `Welcome to ${restaurantName}. I’ll ask a few short questions about categories and tags, then recommend dishes that match.${catPart}${tagPart}`,
    meta: {
      dishCount: live.length,
      categoryCount: categories.length,
      tagCount: tags.length,
    },
  };
}

/** Quick chips derived from real tags/categories (for optional free-ask shortcuts). */
export function buildConciergeQuickPrompts(analysis) {
  const prompts = [];
  for (const cat of analysis.categories.slice(0, 3)) {
    prompts.push(`Show ${cat.name}`);
  }
  for (const t of analysis.dietTags.slice(0, 2)) {
    prompts.push(`Best ${t.tag} dishes`);
  }
  for (const t of analysis.highlightTags.slice(0, 2)) {
    prompts.push(`${t.tag} picks`);
  }
  return prompts.slice(0, 6);
}

export function summarizeAnswers(answers, analysis) {
  const parts = [];
  if (answers.categoryId && answers.categoryId !== 'all') {
    const cat = analysis.categories.find((c) => String(c.id) === String(answers.categoryId));
    if (cat) parts.push(cat.name);
  } else if (answers.categoryId === 'all') {
    parts.push('Entire menu');
  }
  for (const key of ['dietTag', 'highlightTag', 'spiceTag', 'extraTag']) {
    if (answers[key] && answers[key] !== 'any') parts.push(answers[key]);
  }
  return parts;
}
