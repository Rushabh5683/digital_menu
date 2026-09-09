import { formatPrice } from './formatters.js';
import { analyzeMenuForGuidance, getMenuAwareRecommendations } from './helpMeChoose.js';

function ingredientNames(dish) {
  return (dish.ingredients || []).map((i) => (typeof i === 'string' ? i : i?.name || ''));
}

function textCorpus(dish) {
  return `${dish.name || ''} ${dish.nativeName || ''} ${dish.description || ''} ${dish.categoryName || ''} ${(dish.tasteProfile || []).join(' ')} ${(dish.texture || []).join(' ')} ${(dish.searchKeywords || []).join(' ')} ${dish.preparation || ''} ${ingredientNames(dish).join(' ')}`.toLowerCase();
}

function recoveryAlternatives(dishes) {
  const available = (dishes || []).filter((d) => d.availability !== false);
  const picks = [];
  const seen = new Set();

  const push = (dish, reason) => {
    if (!dish || seen.has(dish.id)) return;
    seen.add(dish.id);
    picks.push({ dish, reason });
  };

  for (const d of available.filter((d) => d.isPopular)) {
    push(d, 'A celebrated guest favourite with balanced flavour and reliable excellence.');
    if (picks.length >= 4) break;
  }
  for (const d of available.filter((d) => d.isChefRecommended)) {
    push(d, "Selected by our kitchen team as a standout plate for tonight's service.");
    if (picks.length >= 4) break;
  }
  for (const d of available.filter((d) => d.isSignature)) {
    push(d, 'A signature creation that captures the character of our menu.');
    if (picks.length >= 4) break;
  }
  for (const d of available) {
    push(
      d,
      `${d.spiceLabel || 'Mild'} spiced ${(d.categoryName || 'selection').toLowerCase()} with ${(d.tasteProfile || ['aromatic']).slice(0, 2).join(' & ').toLowerCase()} notes.`,
    );
    if (picks.length >= 4) break;
  }

  return picks.slice(0, 4);
}

/**
 * Natural-language search over a live enriched dishes array.
 */
export function interpretSearchQuery(query, dishes = []) {
  const clean = String(query || '').trim().toLowerCase();

  if (!clean) {
    return {
      query: '',
      interpretedFilters: {},
      contextualHeadline: 'All Dishes',
      results: [],
      isZeroResult: false,
    };
  }

  const isSpicy = /spic|hot|fiery|chilli|pepper|sharp/.test(clean);
  const isMild = /mild|not spicy|gentle|no spice|subtle|cooling/.test(clean);
  const isLight = /light|healthy|diet|clean|low cal|fresh|starter/.test(clean);
  const isFilling = /filling|heavy|rich|hearty|full|hungry/.test(clean);
  const isComforting = /comfort|comforting|creamy|buttery|curry|sauce|warm/.test(clean);
  const isSharing = /share|sharing|for two|platter|family|group|together/.test(clean);
  const isVegetarian = /veg|vegetarian|plant|no meat/.test(clean) && !/non.?veg/.test(clean);
  const isVegan = /vegan|dairy free|plant based/.test(clean);
  const isGlutenFree = /gluten free|coeliac|no gluten/.test(clean);
  const isHighProtein = /protein|meat|chicken|lamb|muscle|fish|scallop/.test(clean);
  const isChicken = /chicken|murgh|poultry/.test(clean);
  const isLamb = /lamb|gosht|mutton|chops|shank/.test(clean);
  const isSeafood = /seafood|fish|prawn|scallop|crab|pomfret/.test(clean);
  const isSweet = /dessert|sweet|kulfi|tiramisu|gulab|sugar|cake/.test(clean);
  const isDrink = /drink|cocktail|mocktail|tea|chai|lassi|tonic|beverage/.test(clean);
  const isPopular = /popular|best|famous|must try|signature|favourite|favorite/.test(clean);
  const isChef = /chef|recommend|special/.test(clean);
  const isButterChickenSimilar = /butter chicken|makhani|similar to butter chicken/.test(clean);

  const scoredDishes = dishes.map((dish) => {
    let score = 0;
    const reasons = [];
    const corpus = textCorpus(dish);
    const searchTerms = clean.split(/\s+/);

    for (const term of searchTerms) {
      if (term.length > 2 && corpus.includes(term)) {
        score += 30;
      }
    }

    if (isButterChickenSimilar) {
      if (/butter chicken|makhani/.test(corpus)) {
        score += 90;
        reasons.push('Creamy tomato-butter profile close to a classic makhani dish.');
      } else if (/cream|malai|velvety/.test(corpus) && (dish.spiceLevel || 0) <= 1) {
        score += 60;
        reasons.push('Creamy and mild, in a similar comfort register to butter chicken.');
      } else if (/dal|lentil/.test(corpus) && dish.richness === 'Rich') {
        score += 45;
        reasons.push('Slow-cooked butter richness with comforting depth.');
      }
    }

    if (isSpicy) {
      if ((dish.spiceLevel || 0) >= 2) {
        score += 40;
        reasons.push(`Warming ${(dish.spiceLabel || 'medium').toLowerCase()} spices with authentic regional heat.`);
      } else {
        score -= 20;
      }
    }

    if (isMild) {
      if ((dish.spiceLevel || 0) <= 1) {
        score += 40;
        reasons.push('Gentle and mild on the palate with zero harsh chilli burn.');
      } else {
        score -= 30;
      }
    }

    if (isLight) {
      if (dish.richness === 'Light' || /starter|beverage|salad/.test(String(dish.category || '').toLowerCase())) {
        score += 35;
        reasons.push('Clean and light preparation without heavy creams.');
      }
    }

    if (isFilling) {
      if (dish.richness === 'Rich' || /main|biryani|rice/.test(String(dish.category || dish.categoryName || '').toLowerCase())) {
        score += 35;
        reasons.push('Hearty, satisfying portion slow-cooked for deep nourishment.');
      }
    }

    if (isComforting) {
      if ((dish.tasteProfile || []).some((t) => /Creamy|Comforting|Velvety|Buttery/i.test(t))) {
        score += 35;
        reasons.push('Luscious, comforting texture with aromatic herbs.');
      }
    }

    if (isSharing) {
      if (dish.portion === 'Best shared' || dish.portion === 'Good for 2') {
        score += 50;
        reasons.push('Generous portion designed for passing around the table.');
      }
    }

    if (isVegetarian) {
      if ((dish.dietaryTags || []).includes('Vegetarian') || (dish.dietaryTags || []).includes('Vegan')) {
        score += 40;
        reasons.push('Plant-forward selection rich in texture and aroma.');
      } else {
        score -= 100;
      }
    }

    if (isVegan) {
      if ((dish.dietaryTags || []).includes('Vegan')) {
        score += 50;
        reasons.push('100% plant-based with zero dairy.');
      } else {
        score -= 100;
      }
    }

    if (isGlutenFree) {
      if ((dish.dietaryTags || []).includes('Gluten-Free')) {
        score += 40;
        reasons.push('Naturally wheat-free preparation.');
      } else {
        score -= 80;
      }
    }

    const ings = ingredientNames(dish).join(' ').toLowerCase();

    if (isHighProtein) {
      if (/chicken|lamb|scallop|duck|paneer|prawn|fish|tofu/.test(ings)) {
        score += 30;
        reasons.push('High-protein centrepiece cooked with care.');
      }
    }

    if (isChicken && /chicken|murgh/.test(ings + ' ' + corpus)) {
      score += 45;
      reasons.push('Tender poultry preparation.');
    }

    if (isLamb && /lamb|mutton|gosht/.test(ings + ' ' + corpus)) {
      score += 45;
      reasons.push('Prime lamb cuts.');
    }

    if (isSeafood && /scallop|prawn|pomfret|fish|seafood|crab/.test(ings + ' ' + corpus)) {
      score += 45;
      reasons.push('Fresh seafood selection.');
    }

    if (isSweet && /dessert|sweet|confection/.test(String(dish.categoryName || dish.category || '').toLowerCase())) {
      score += 50;
      reasons.push('Artisanal confectionery.');
    }

    if (isDrink && /beverage|drink|tea|cocktail/.test(String(dish.categoryName || dish.category || '').toLowerCase())) {
      score += 50;
      reasons.push('Refreshing drink pairing.');
    }

    if (isPopular && dish.isPopular) {
      score += 25;
      reasons.push('One of our most celebrated guest favourites tonight.');
    }

    if (isChef && dish.isChefRecommended) {
      score += 25;
      reasons.push('Selected personally by our kitchen.');
    }

    const primaryReason =
      reasons.length > 0 ? reasons[0] : dish.whyRelevantHint || 'Matches your search query.';

    return { dish, score, relevanceReason: primaryReason };
  });

  const matching = scoredDishes
    .filter((item) => item.score > 15)
    .sort((a, b) => b.score - a.score);

  let headline = 'Curated Options';
  if (isButterChickenSimilar) headline = 'Dishes with Butter Chicken Flavour Profiles';
  else if (isMild && isVegetarian) headline = 'Mild Vegetarian Selections';
  else if (isMild) headline = 'Mild & Gentle Dishes';
  else if (isSpicy) headline = 'Spiced & Fiery Specialities';
  else if (isLight) headline = 'Light & Fresh Options';
  else if (isSharing) headline = 'Dishes Made for Sharing';
  else if (isVegetarian) headline = 'Vegetarian Creations';
  else if (isHighProtein) headline = 'Protein-Rich Selections';
  else if (clean) headline = `Results for "${query}"`;

  if (matching.length > 0) {
    return {
      query,
      interpretedFilters: {
        dietary: isVegetarian ? ['Vegetarian'] : isVegan ? ['Vegan'] : isGlutenFree ? ['Gluten-Free'] : undefined,
        spice: isSpicy ? [2, 3] : isMild ? [0, 1] : undefined,
        richness: isLight ? ['Light'] : isFilling ? ['Rich'] : undefined,
        portion: isSharing ? ['Best shared', 'Good for 2'] : undefined,
      },
      contextualHeadline: headline,
      results: matching.map((m) => ({ dish: m.dish, relevanceReason: m.relevanceReason })),
      isZeroResult: false,
    };
  }

  return {
    query,
    interpretedFilters: {},
    contextualHeadline: `Close alternatives for "${query}"`,
    results: [],
    isZeroResult: true,
    recoveryAlternatives: recoveryAlternatives(dishes),
  };
}

/**
 * Help Me Choose — top dishes with explanations from THIS restaurant's menu.
 */
export function getHelpMeChooseRecommendations(answers, dishes = [], restaurantName) {
  const analysis = analyzeMenuForGuidance(dishes, { restaurantName });
  return getMenuAwareRecommendations(answers, dishes, analysis);
}

/**
 * Honest side-by-side compare — only admin tags, description words, and price.
 * No invented taste/richness/spice guesses.
 */
const DIET_COMPARE_TAGS = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain', 'Egg-Free'];
const SPICE_TAG_ORDER = ['Mild', 'Spicy', 'Hot'];
/** Words we may surface only if they literally appear in description or tags. */
const MENTION_WORDS = [
  'creamy',
  'butter',
  'buttery',
  'smoky',
  'spicy',
  'mild',
  'hot',
  'sweet',
  'tangy',
  'crispy',
  'grilled',
  'fried',
  'baked',
  'rich',
  'light',
  'fresh',
  'cheesy',
  'garlicky',
  'coconut',
  'tandoori',
  'masala',
];

function dishTags(dish) {
  return (dish?.dietaryTags || []).map((t) => String(t).trim()).filter(Boolean);
}

function dietLabel(dish) {
  const tags = dishTags(dish);
  const found = DIET_COMPARE_TAGS.filter((tag) =>
    tags.some((t) => t.toLowerCase() === tag.toLowerCase()),
  );
  return found.length ? found.join(' · ') : '—';
}

function spiceFromTags(dish) {
  const tags = dishTags(dish).map((t) => t.toLowerCase());
  for (let i = SPICE_TAG_ORDER.length - 1; i >= 0; i -= 1) {
    const label = SPICE_TAG_ORDER[i];
    if (tags.includes(label.toLowerCase())) return label;
  }
  return '—';
}

function spiceRank(label) {
  const idx = SPICE_TAG_ORDER.indexOf(label);
  return idx >= 0 ? idx + 1 : 0;
}

function mentionedNotes(dish) {
  const tags = dishTags(dish).join(' ').toLowerCase();
  const description = String(dish?.description || '').toLowerCase();
  const haystack = `${description} ${tags}`;
  const found = [];
  for (const word of MENTION_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(haystack) && !found.includes(word)) {
      found.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
  }
  // Also surface highlight tags guests already selected (not diet/spice duplicates)
  const highlightSkip = new Set([
    ...DIET_COMPARE_TAGS.map((t) => t.toLowerCase()),
    ...SPICE_TAG_ORDER.map((t) => t.toLowerCase()),
    'halal',
    'gluten-free',
    'dairy-free',
    'nut-free',
  ]);
  for (const tag of dishTags(dish)) {
    const key = tag.toLowerCase();
    if (highlightSkip.has(key) || key.startsWith('contains ')) continue;
    if (!found.some((f) => f.toLowerCase() === key)) found.push(tag);
  }
  return found.length ? found.slice(0, 4).join(' · ') : '—';
}

function buildHonestAdvice(dishA, dishB, currency) {
  const spiceA = spiceFromTags(dishA);
  const spiceB = spiceFromTags(dishB);
  const priceA = Number(dishA.price) || 0;
  const priceB = Number(dishB.price) || 0;
  const bits = [];

  if (spiceA !== '—' && spiceB !== '—' && spiceA !== spiceB) {
    const hotter = spiceRank(spiceA) > spiceRank(spiceB) ? dishA : dishB;
    const milder = hotter.id === dishA.id ? dishB : dishA;
    bits.push(
      `${hotter.name} is tagged ${spiceFromTags(hotter)}; ${milder.name} is tagged ${spiceFromTags(milder)}.`,
    );
  } else if (spiceA !== '—' || spiceB !== '—') {
    if (spiceA !== '—') bits.push(`${dishA.name} is tagged ${spiceA}.`);
    if (spiceB !== '—') bits.push(`${dishB.name} is tagged ${spiceB}.`);
  }

  if (priceA !== priceB) {
    const cheaper = priceA < priceB ? dishA : dishB;
    const costlier = cheaper.id === dishA.id ? dishB : dishA;
    bits.push(
      `${cheaper.name} is ${formatPrice(cheaper.price, currency)}; ${costlier.name} is ${formatPrice(costlier.price, currency)}.`,
    );
  }

  const dietA = dietLabel(dishA);
  const dietB = dietLabel(dishB);
  if (dietA !== '—' || dietB !== '—') {
    if (dietA !== dietB) {
      bits.push(
        `Diet: ${dishA.name} (${dietA}) vs ${dishB.name} (${dietB}).`,
      );
    }
  }

  if (bits.length === 0) return null;
  return bits.join(' ');
}

export function compareDishes(dishA, dishB, currency) {
  const diffs = [
    {
      label: 'Diet',
      valA: dietLabel(dishA),
      valB: dietLabel(dishB),
    },
    {
      label: 'Spice',
      valA: spiceFromTags(dishA),
      valB: spiceFromTags(dishB),
    },
    {
      label: 'Notes',
      valA: mentionedNotes(dishA),
      valB: mentionedNotes(dishB),
    },
    {
      label: 'Price',
      valA: formatPrice(dishA.price, currency),
      valB: formatPrice(dishB.price, currency),
    },
  ].filter((row) => !(row.valA === '—' && row.valB === '—' && row.label !== 'Price'));

  return {
    diffs,
    advice: buildHonestAdvice(dishA, dishB, currency),
  };
}

/**
 * Menu Concierge Q&A over live dishes.
 * Returns { answer, dishes } (also includes recommendedDishes for Arcadia parity).
 */
export function answerConciergeQuery(question, dishes = [], restaurantName = 'our restaurant') {
  const q = String(question || '').toLowerCase();
  const name = restaurantName || 'our restaurant';
  const available = dishes.filter((d) => d.availability !== false);

  const wrap = (answer, list) => ({
    answer,
    dishes: list,
    recommendedDishes: list,
  });

  if (/popular|famous|must try|favourite|favorite/.test(q)) {
    const populars = available.filter((d) => d.isPopular).slice(0, 3);
    const list = populars.length > 0 ? populars : available.slice(0, 3);
    const names = list.map((d) => d.name).join(', ');
    return wrap(
      `Our guests frequently celebrate ${names || 'our seasonal highlights'} as the quintessential ${name} experience.`,
      list,
    );
  }

  if (/mild|not spicy|no spice/.test(q)) {
    const milds = available.filter((d) => (d.spiceLevel || 0) <= 1).slice(0, 3);
    const names = milds.map((d) => d.name).join(', ');
    return wrap(
      `For a gentle, aromatic journey with zero harsh chilli burn, consider ${names || 'our milder preparations'} — focused on cream, herbs, and soft spice.`,
      milds,
    );
  }

  if (/share|sharing|two|group/.test(q)) {
    const sharing = available.filter((d) => d.portion === 'Best shared' || d.portion === 'Good for 2');
    const list = sharing.length > 0 ? sharing.slice(0, 3) : available.filter((d) => d.richness === 'Rich').slice(0, 3);
    const names = list.map((d) => d.name).join(', ');
    return wrap(
      `${names || 'Several of our larger plates'} are created specifically for passing around the table and sharing family-style.`,
      list,
    );
  }

  if (/vegetarian|plant|\bveg\b/.test(q) && !/non[\s-]*veg/.test(q)) {
    const veg = available
      .filter((d) => {
        const tags = (d.dietaryTags || []).map((t) => String(t).toLowerCase());
        if (tags.some((t) => /non[\s-]*veg|nonveg/.test(t))) return false;
        if (/chicken|murgh|mutton|lamb|fish|prawn|gosht|keema|egg\b/.test(textCorpus(d))) {
          return false;
        }
        return (
          tags.some((t) => t === 'vegetarian' || t === 'vegan' || t === 'veg' || t === 'jain') ||
          /paneer|aloo|\bdal\b|gobi|palak|chole|rajma/.test(String(d.name || '').toLowerCase())
        );
      })
      .slice(0, 3);
    const names = veg.map((d) => d.name).join(', ');
    return wrap(
      `Our vegetarian menu features ${names || 'thoughtfully prepared plant-forward dishes'}, ensuring uncompromising depth and texture.`,
      veg,
    );
  }

  if (/chicken/.test(q)) {
    const chickens = available.filter((d) =>
      /chicken|murgh/.test(textCorpus(d)),
    );
    const names = chickens.slice(0, 3).map((d) => d.name).join(', ');
    return wrap(
      chickens.length > 0
        ? `We serve several distinct chicken preparations, including ${names}.`
        : `I can help you explore poultry dishes across the ${name} menu — browse the categories for current availability.`,
      chickens.slice(0, 3),
    );
  }

  if (/dairy|dairy free|lactose/.test(q)) {
    const df = available.filter((d) => (d.dietaryTags || []).includes('Dairy-Free')).slice(0, 3);
    const names = df.map((d) => d.name).join(', ');
    return wrap(
      df.length > 0
        ? `We have verified dairy-free dishes including ${names}.`
        : `Ask your server about dairy-free adaptations — several plates can be prepared without cream or butter.`,
      df,
    );
  }

  const general = available.filter((d) => d.isChefRecommended).slice(0, 3);
  const list = general.length > 0 ? general : available.filter((d) => d.isPopular || d.isSignature).slice(0, 3);
  const names = list.map((d) => d.name).join(', ');
  return wrap(
    `Welcome to ${name}. Our menu is prepared fresh to order. Here are three plates to anchor your dinner${names ? `: ${names}` : ''}.`,
    list.length > 0 ? list : available.slice(0, 3),
  );
}
