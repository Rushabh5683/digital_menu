import { Dish, SearchIntentResult, PortionGuidance, RichnessLevel } from '../types';
import { DISHES } from '../data/restaurantData';
import { formatPrice } from '../utils/formatters';

export function interpretSearchQuery(query: string): SearchIntentResult {
  const clean = query.trim().toLowerCase();

  if (!clean) {
    return {
      query: '',
      interpretedFilters: {},
      contextualHeadline: 'All Dishes',
      results: [],
      isZeroResult: false,
    };
  }

  // Intent parsing
  const isSpicy = /spic|hot|fiery|chilli|pepper|sharp/.test(clean);
  const isMild = /mild|not spicy|gentle|no spice|subtle|cooling/.test(clean);
  const isLight = /light|healthy|diet|clean|low cal|fresh|starter/.test(clean);
  const isFilling = /filling|heavy|rich|hearty|full|hungry/.test(clean);
  const isComforting = /comfort|comforting|creamy|buttery|curry|sauce|warm/.test(clean);
  const isSharing = /share|sharing|for two|platter|family|group|together/.test(clean);
  const isVegetarian = /veg|vegetarian|plant|no meat/.test(clean);
  const isVegan = /vegan|dairy free|plant based/.test(clean);
  const isGlutenFree = /gluten free|coeliac|no gluten/.test(clean);
  const isHighProtein = /protein|meat|chicken|lamb|muscle|fish|scallop/.test(clean);
  const isChicken = /chicken|murgh|poultry/.test(clean);
  const isLamb = /lamb|gosht|mutton|chops|shank/.test(clean);
  const isSeafood = /seafood|fish|prawn|scallop|crab|pomfret/.test(clean);
  const isSweet = /dessert|sweet|kulfi|tiramisu|gulab|sugar|cake/.test(clean);
  const isDrink = /drink|cocktail|mocktail|tea|chai|lassi|tonic|beverage/.test(clean);
  const isPopular = /popular|best|famous|must try|signature|favourite/.test(clean);
  const isChef = /chef|recommend|special/.test(clean);
  const isButterChickenSimilar = /butter chicken|makhani|similar to butter chicken/.test(clean);

  // Score dishes
  const scoredDishes = DISHES.map((dish) => {
    let score = 0;
    let reasons: string[] = [];

    const textCorpus = `${dish.name} ${dish.nativeName || ''} ${dish.description} ${dish.categoryName} ${dish.tasteProfile.join(' ')} ${dish.texture.join(' ')} ${dish.searchKeywords.join(' ')} ${dish.preparation}`.toLowerCase();

    // Exact word or substring matches
    const searchTerms = clean.split(/\s+/);
    for (const term of searchTerms) {
      if (term.length > 2 && textCorpus.includes(term)) {
        score += 30;
      }
    }

    if (isButterChickenSimilar) {
      if (dish.id === 'old-delhi-butter-chicken') {
        score += 100;
        reasons.push('Our authentic original Old Delhi recipe with charcoal smoke and velvety gravy.');
      } else if (dish.id === 'smoked-paneer-makhani') {
        score += 90;
        reasons.push('The vegetarian counterpart: fresh cottage cheese in woodfire-smoked tomato butter cream.');
      } else if (dish.id === 'murgh-malai-truffle') {
        score += 70;
        reasons.push('Creamy and mild like butter chicken, but served as succulent charcoal grilled skewers with winter truffle.');
      } else if (dish.id === 'arcadia-dal-24hr') {
        score += 60;
        reasons.push('Similar slow-cooked butter richness with earthy black lentils.');
      }
    }

    // Specific intent bonuses
    if (isSpicy) {
      if (dish.spiceLevel >= 2) {
        score += 40;
        reasons.push(`Warming ${dish.spiceLabel.toLowerCase()} spices with authentic regional heat.`);
      } else {
        score -= 20;
      }
    }

    if (isMild) {
      if (dish.spiceLevel <= 1) {
        score += 40;
        reasons.push('Gentle and mild on the palate with zero harsh chilli burn.');
      } else {
        score -= 30;
      }
    }

    if (isLight) {
      if (dish.richness === 'Light' || dish.category === 'starters' || dish.category === 'beverages') {
        score += 35;
        reasons.push('Clean and light preparation without heavy creams.');
      }
    }

    if (isFilling) {
      if (dish.richness === 'Rich' || dish.category === 'mains' || dish.category === 'biryani-rice') {
        score += 35;
        reasons.push('Hearty, satisfying portion slow-cooked for deep nourishment.');
      }
    }

    if (isComforting) {
      if (dish.tasteProfile.includes('Creamy') || dish.tasteProfile.includes('Comforting') || dish.tasteProfile.includes('Velvety')) {
        score += 35;
        reasons.push('Luscious, comforting texture with aromatic herbs and cultured butter.');
      }
    }

    if (isSharing) {
      if (dish.portion === 'Best shared' || dish.portion === 'Good for 2') {
        score += 50;
        reasons.push('Generous portion designed for passing around the table.');
      }
    }

    if (isVegetarian) {
      if (dish.dietaryTags.includes('Vegetarian')) {
        score += 40;
        reasons.push('Plant-forward selection rich in texture and aroma.');
      } else {
        score -= 100;
      }
    }

    if (isVegan) {
      if (dish.dietaryTags.includes('Vegan')) {
        score += 50;
        reasons.push('100% plant-based with zero dairy or honey.');
      } else {
        score -= 100;
      }
    }

    if (isGlutenFree) {
      if (dish.dietaryTags.includes('Gluten-Free')) {
        score += 40;
        reasons.push('Naturally wheat-free preparation.');
      } else {
        score -= 80;
      }
    }

    if (isHighProtein) {
      if (dish.ingredients.some((i) => /chicken|lamb|scallop|duck|paneer|prawn/.test(i.name.toLowerCase()))) {
        score += 30;
        reasons.push('High-protein prime cut cooked over charcoal.');
      }
    }

    if (isChicken && dish.ingredients.some((i) => i.name.toLowerCase().includes('chicken'))) {
      score += 45;
      reasons.push('Corn-fed tender poultry.');
    }

    if (isLamb && dish.ingredients.some((i) => /lamb|mutton/.test(i.name.toLowerCase()))) {
      score += 45;
      reasons.push('Prime British lamb cuts.');
    }

    if (isSeafood && dish.ingredients.some((i) => /scallop|prawn|pomfret|fish/.test(i.name.toLowerCase()))) {
      score += 45;
      reasons.push('Ocean-fresh sustainable seafood.');
    }

    if (isSweet && dish.category === 'desserts') {
      score += 50;
      reasons.push('Artisanal confectionery.');
    }

    if (isDrink && dish.category === 'beverages') {
      score += 50;
      reasons.push('Botanical drink pairing.');
    }

    if (isPopular && dish.isPopular) {
      score += 25;
      reasons.push('One of our most celebrated guest favourites tonight.');
    }

    if (isChef && dish.isChefRecommended) {
      score += 25;
      reasons.push('Selected personally by our Executive Chef.');
    }

    // Default reason fallback
    const primaryReason = reasons.length > 0 ? reasons[0] : (dish.whyRelevantHint || 'Matches your search query.');

    return {
      dish,
      score,
      relevanceReason: primaryReason,
    };
  });

  // Filter and sort results
  const matching = scoredDishes
    .filter((item) => item.score > 15)
    .sort((a, b) => b.score - a.score);

  // Determine headline
  let headline = 'Curated Options';
  if (isButterChickenSimilar) headline = 'Dishes with Butter Chicken Flavour Profiles';
  else if (isMild && isVegetarian) headline = 'Mild Vegetarian Selections';
  else if (isMild) headline = 'Mild & Gentle Dishes';
  else if (isSpicy) headline = 'Spiced & Fiery Specialities';
  else if (isLight) headline = 'Light & Fresh Options';
  else if (isSharing) headline = 'Dishes Made for Sharing';
  else if (isVegetarian) headline = 'Vegetarian Creations';
  else if (isHighProtein) headline = 'Protein-Rich Charcoal Selections';
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

  // ZERO RESULT RECOVERY STATE:
  // Give 3-4 thoughtful alternatives with clear explanations rather than a dead end!
  const fallbackAlternatives = [
    {
      dish: DISHES.find((d) => d.id === 'murgh-tikka-charcoal')!,
      reason: 'Our most balanced tandoor plate: smoky, tender, and medium-spiced.',
    },
    {
      dish: DISHES.find((d) => d.id === 'arcadia-dal-24hr')!,
      reason: 'Earthy, comforting and slow-cooked for 24 hours on smouldering embers.',
    },
    {
      dish: DISHES.find((d) => d.id === 'truffle-mushroom-kakori')!,
      reason: 'Silky and rich in wild Himalayan morel mushroom umami, suitable for all palates.',
    },
    {
      dish: DISHES.find((d) => d.id === 'old-delhi-butter-chicken')!,
      reason: 'Our definitive comforting classic with velvety charcoal-smoked tomato sauce.',
    },
  ].filter((item) => Boolean(item.dish));

  return {
    query,
    interpretedFilters: {},
    contextualHeadline: `Close alternatives for "${query}"`,
    results: [],
    isZeroResult: true,
    recoveryAlternatives: fallbackAlternatives,
  };
}

// "Help Me Choose" Guided Concierge Recommendation Logic
export function getHelpMeChooseRecommendations(answers: {
  mood: string; // 'light' | 'filling' | 'comforting' | 'new' | 'popular' | 'chef'
  spice: string; // 'none' | 'mild' | 'medium' | 'hot'
  protein: string; // 'vegetarian' | 'chicken' | 'seafood' | 'lamb' | 'anything'
  hunger: string; // 'little' | 'normal' | 'hungry'
}): { dish: Dish; explanation: string }[] {
  const scored = DISHES.map((dish) => {
    let score = 0;
    let reason = '';

    // Availability filter
    if (!dish.availability) return { dish, score: -100, explanation: '' };

    // Spice alignment
    if (answers.spice === 'none' && dish.spiceLevel === 0) score += 40;
    else if (answers.spice === 'mild' && dish.spiceLevel <= 1) score += 40;
    else if (answers.spice === 'medium' && dish.spiceLevel === 2) score += 40;
    else if (answers.spice === 'hot' && dish.spiceLevel === 3) score += 40;
    else if (answers.spice === 'none' && dish.spiceLevel > 1) score -= 50;

    // Protein / Dietary alignment
    if (answers.protein === 'vegetarian') {
      if (dish.dietaryTags.includes('Vegetarian')) score += 50;
      else score -= 100;
    } else if (answers.protein === 'chicken') {
      if (dish.ingredients.some((i) => i.name.toLowerCase().includes('chicken'))) score += 50;
    } else if (answers.protein === 'seafood') {
      if (dish.ingredients.some((i) => /scallop|prawn|pomfret|fish/.test(i.name.toLowerCase()))) score += 50;
    } else if (answers.protein === 'lamb') {
      if (dish.ingredients.some((i) => /lamb|mutton/.test(i.name.toLowerCase()))) score += 50;
    }

    // Mood alignment
    if (answers.mood === 'light' && (dish.richness === 'Light' || dish.category === 'starters')) {
      score += 35;
      reason = 'Light and cleanly prepared over charcoal without heavy sauces.';
    } else if (answers.mood === 'filling' && (dish.richness === 'Rich' || dish.category === 'mains' || dish.category === 'biryani-rice')) {
      score += 35;
      reason = 'Substantial, deeply nourishing plate simmered with slow-cooked spices.';
    } else if (answers.mood === 'comforting' && (dish.tasteProfile.includes('Creamy') || dish.tasteProfile.includes('Comforting'))) {
      score += 35;
      reason = 'Warm, velvety texture paired with comforting aromatics.';
    } else if (answers.mood === 'new' && (dish.isSignature || dish.ingredients.some((i) => /truffle|morel|scallop|duck/.test(i.name.toLowerCase())))) {
      score += 35;
      reason = 'An inventive signature highlighting heritage techniques with rare ingredients.';
    } else if (answers.mood === 'popular' && dish.isPopular) {
      score += 35;
      reason = 'A guest favourite celebrated for reliable excellence tonight.';
    } else if (answers.mood === 'chef' && dish.isChefRecommended) {
      score += 35;
      reason = 'Our kitchen team’s standout recommendation for tonight’s service.';
    }

    // Hunger alignment
    if (answers.hunger === 'little' && dish.category === 'starters') score += 20;
    if (answers.hunger === 'hungry' && (dish.portion === 'Good for 2' || dish.portion === 'Best shared' || dish.category === 'mains')) score += 20;

    if (!reason) {
      reason = `${dish.spiceLabel} spiced ${dish.categoryName.toLowerCase()} with ${dish.tasteProfile.join(' & ').toLowerCase()} notes.`;
    }

    return { dish, score, explanation: reason };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => ({
      dish: item.dish,
      explanation: `${item.dish.tasteProfile.slice(0, 2).join(' and ')} — ${item.explanation}`,
    }));
}

// Comparison analysis generator between 2 dishes
export function compareDishes(dishA: Dish, dishB: Dish) {
  const diffs = [
    {
      label: 'Taste Profile',
      valA: dishA.tasteProfile.join(' · '),
      valB: dishB.tasteProfile.join(' · '),
    },
    {
      label: 'Spice Level',
      valA: `${dishA.spiceLabel} (${'🌶'.repeat(Math.max(1, dishA.spiceLevel))})`,
      valB: `${dishB.spiceLabel} (${'🌶'.repeat(Math.max(1, dishB.spiceLevel))})`,
    },
    {
      label: 'Richness',
      valA: dishA.richness,
      valB: dishB.richness,
    },
    {
      label: 'Texture',
      valA: dishA.texture.join(', '),
      valB: dishB.texture.join(', '),
    },
    {
      label: 'Preparation Method',
      valA: dishA.preparation,
      valB: dishB.preparation,
    },
    {
      label: 'Portion',
      valA: dishA.portion,
      valB: dishB.portion,
    },
    {
      label: 'Price',
      valA: formatPrice(dishA.price),
      valB: formatPrice(dishB.price),
    },
  ];

  // Natural hospitality decision advice
  let advice = `Choose ${dishA.name} if you prefer ${dishA.tasteProfile[0].toLowerCase()} notes and a ${dishA.spiceLabel.toLowerCase()} profile. Choose ${dishB.name} if you want something ${dishB.tasteProfile[0].toLowerCase()} with a ${dishB.richness.toLowerCase()} body.`;

  if (dishA.spiceLevel > dishB.spiceLevel) {
    advice = `Choose ${dishA.name} for bolder, punchier warmth. Choose ${dishB.name} if you want a milder, creamier dining experience.`;
  } else if (dishA.richness === 'Light' && dishB.richness === 'Rich') {
    advice = `Choose ${dishA.name} for a lighter, clean preparation. Choose ${dishB.name} if you are craving a deeply indulgent, comforting sauce.`;
  }

  return {
    diffs,
    advice,
  };
}

// Menu Concierge query answering
export function answerConciergeQuery(question: string): {
  answer: string;
  recommendedDishes: Dish[];
} {
  const q = question.toLowerCase();

  if (q.includes('popular') || q.includes('famous') || q.includes('must try')) {
    const populars = DISHES.filter((d) => d.isPopular && d.availability).slice(0, 3);
    return {
      answer: 'Our guests frequently celebrate our 24-Hour Dal Arcadia, the Old Delhi Butter Chicken, and Himalayan Lamb Chops as the quintessential Arcadia experience.',
      recommendedDishes: populars,
    };
  }

  if (q.includes('mild') || q.includes('not spicy') || q.includes('no spice')) {
    const milds = DISHES.filter((d) => d.spiceLevel <= 1 && d.availability).slice(0, 3);
    return {
      answer: 'For a gentle, aromatic journey with zero harsh chilli burn, our Murgh Malai Truffle Tikka, Coastal Prawn Moilee, and Dal Arcadia focus on cream, cardamom, and fresh coconut.',
      recommendedDishes: milds,
    };
  }

  if (q.includes('share') || q.includes('sharing') || q.includes('two') || q.includes('group')) {
    const sharing = DISHES.filter((d) => (d.portion === 'Best shared' || d.portion === 'Good for 2') && d.availability);
    return {
      answer: 'Our Royal Tandoori Feast and Awadhi Dum Biryanis are created specifically for passing around the table and sharing family-style.',
      recommendedDishes: sharing,
    };
  }

  if (q.includes('vegetarian') || q.includes('plant') || q.includes('veg')) {
    const veg = DISHES.filter((d) => d.dietaryTags.includes('Vegetarian') && d.availability).slice(0, 3);
    return {
      answer: 'Our vegetarian menu features our wild Morel Kakori kebabs, organic Paneer Makhani, and the 24-Hour Charcoal Dal, ensuring uncompromising depth and texture.',
      recommendedDishes: veg,
    };
  }

  if (q.includes('chicken')) {
    const chickens = DISHES.filter((d) => d.ingredients.some((i) => i.name.toLowerCase().includes('chicken')) && d.availability);
    return {
      answer: 'We serve three distinct chicken preparations: the smoky charred Charcoal Tikka, the mild truffle-scented Murgh Malai, and our iconic Old Delhi Butter Chicken.',
      recommendedDishes: chickens,
    };
  }

  if (q.includes('dairy') || q.includes('dairy free') || q.includes('lactose')) {
    const df = DISHES.filter((d) => d.dietaryTags.includes('Dairy-Free') && d.availability).slice(0, 3);
    return {
      answer: 'We have several verified dairy-free dishes crafted with cold-pressed coconut milk, including the Malabar Prawn Moilee, Chettinad Pepper Duck, and Nilgiri Lamb Shank.',
      recommendedDishes: df,
    };
  }

  // General hospitality answer
  const general = DISHES.filter((d) => d.isChefRecommended && d.availability).slice(0, 3);
  return {
    answer: 'Welcome to Arcadia. Our menu is anchored in charcoal tandoor grilling and slow earthen pot simmers. Here are three signature plates to anchor your dinner.',
    recommendedDishes: general,
  };
}
