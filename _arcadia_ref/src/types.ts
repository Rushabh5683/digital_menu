export type SpiceLevel = 0 | 1 | 2 | 3; // 0: No spice, 1: Mild, 2: Medium, 3: Hot
export type RichnessLevel = 'Light' | 'Medium' | 'Rich';
export type PortionGuidance = 'Good for 1' | 'Good for 2' | 'Best shared' | 'Individual';
export type DietaryTag = 'Vegetarian' | 'Vegan' | 'Gluten-Free' | 'Halal' | 'Dairy-Free' | 'Nut-Free';

export interface IngredientDetail {
  name: string;
  note?: string; // Informative hospitality note when tapped
  isAllergen?: boolean;
}

export interface Dish {
  id: string;
  name: string;
  nativeName?: string;
  category: string; // e.g., 'starters', 'mains', 'grills', 'breads-sides', 'desserts', 'beverages'
  categoryName: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  imageAlt?: string;
  ingredients: IngredientDetail[];
  dietaryTags: string[]; // e.g., 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal'
  allergens: string[];
  spiceLevel: SpiceLevel;
  spiceLabel: 'No spice' | 'Mild' | 'Medium' | 'Hot';
  richness: RichnessLevel;
  tasteProfile: string[]; // e.g., ['Smoky', 'Charred', 'Spiced', 'Tender']
  texture: string[]; // e.g., ['Tender', 'Crisp', 'Silky']
  portion: PortionGuidance;
  preparation: string; // e.g., 'Clay Tandoor Roast', 'Slow simmered 24hrs', 'Woodfire Smoked'
  availability: boolean;
  unavailableReason?: string;
  suggestedAlternativeIds?: string[];
  isPopular?: boolean;
  isChefRecommended?: boolean;
  isSignature?: boolean;
  isNew?: boolean;
  calories?: number;
  similarDishIds: string[];
  pairingDishIds: string[];
  pairingBeverage?: string;
  searchKeywords: string[];
  whatToExpect: string;
  whyRelevantHint?: string;
}

export interface Category {
  id: string;
  name: string;
  shortDescription: string;
  iconName?: string;
  featuredCount?: number;
}

export interface RestaurantConfig {
  id: string;
  name: string;
  tagline: string;
  cuisine: string;
  location: string;
  currencySymbol: string;
  currencyCode: string;
  serviceHours: string;
  tableContext: string;
  currentLanguage: string;
  supportedLanguages: { code: string; label: string }[];
}

export type EventName =
  | 'MENU_OPENED'
  | 'CATEGORY_VIEWED'
  | 'DISH_VIEWED'
  | 'SEARCH_PERFORMED'
  | 'SEARCH_RESULT_CLICKED'
  | 'ZERO_RESULT_SEARCH'
  | 'FILTER_APPLIED'
  | 'FILTER_REMOVED'
  | 'PREFERENCE_SELECTED'
  | 'INGREDIENTS_OPENED'
  | 'INGREDIENT_TAPPED'
  | 'DIETARY_INFO_OPENED'
  | 'SPICE_INFO_OPENED'
  | 'DESCRIPTION_EXPANDED'
  | 'DISH_COMPARED'
  | 'COMPARISON_COMPLETED'
  | 'RECOMMENDATION_SHOWN'
  | 'RECOMMENDATION_CLICKED'
  | 'HELP_ME_CHOOSE_STARTED'
  | 'HELP_ME_CHOOSE_COMPLETED'
  | 'ASSISTANT_OPENED'
  | 'ASSISTANT_QUESTION_ASKED'
  | 'ASSISTANT_RECOMMENDATION_CLICKED'
  | 'ALTERNATIVE_SHOWN'
  | 'ALTERNATIVE_CLICKED'
  | 'UNAVAILABLE_DISH_VIEWED'
  | 'SEARCH_RECOVERY_SHOWN'
  | 'SEARCH_RECOVERY_CLICKED'
  | 'SHORTLIST_ITEM_ADDED'
  | 'SHORTLIST_ITEM_REMOVED'
  | 'SHORTLIST_VIEWED'
  | 'SESSION_ENDED';

export interface BehaviouralEvent {
  id: string;
  eventName: EventName;
  timestamp: number;
  sessionId: string;
  restaurantId: string;
  dishId?: string;
  dishName?: string;
  categoryId?: string;
  searchQuery?: string;
  intent?: Record<string, any>;
  comparisonPair?: [string, string];
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SessionJourneyStep {
  id: string;
  stage: 'FIND' | 'UNDERSTAND' | 'DECIDE' | 'RECOVER';
  event: EventName;
  label: string;
  timestamp: number;
  details?: string;
}

export interface UserPreferences {
  dietary: string[];
  maxSpice: number | null;
  moodFilter: string | null;
  selectedRichness: RichnessLevel | null;
}

export interface SearchIntentResult {
  query: string;
  interpretedFilters: {
    dietary?: string[];
    spice?: number[];
    richness?: RichnessLevel[];
    portion?: PortionGuidance[];
    category?: string;
    isPopular?: boolean;
    isChefRecommended?: boolean;
    keywords?: string[];
  };
  contextualHeadline: string;
  results: {
    dish: Dish;
    relevanceReason: string;
  }[];
  isZeroResult: boolean;
  recoveryAlternatives?: {
    dish: Dish;
    reason: string;
  }[];
}
