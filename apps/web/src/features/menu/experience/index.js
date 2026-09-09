import './experience.css';

export { enrichDish, enrichMenu, matchesMood, matchesFilters } from './lib/enrichDish.js';
export {
  interpretSearchQuery,
  getHelpMeChooseRecommendations,
  answerConciergeQuery,
  compareDishes,
} from './lib/recommendations.js';
export {
  analyzeMenuForGuidance,
  buildHelpMeChooseSteps,
  getMenuAwareRecommendations,
  poolFromAnswers,
  summarizeGuidanceAnswers,
  answersFromHelpChoice,
} from './lib/helpMeChoose.js';
export {
  analyzeMenuForConcierge,
  buildConciergeSteps,
  getConciergeRecommendations,
} from './lib/conciergeFlow.js';
export { formatPrice, dishImage, parsePrice } from './lib/formatters.js';

export { ExperienceHeader } from './ExperienceHeader.jsx';
export { WelcomeSection } from './WelcomeSection.jsx';
export { ExperienceSearchBar } from './ExperienceSearchBar.jsx';
export { SearchResultsView } from './SearchResultsView.jsx';
export { ExperienceCategoryNav } from './ExperienceCategoryNav.jsx';
export { CategoryDishRail } from './CategoryDishRail.jsx';
export { ExperienceDishCard } from './ExperienceDishCard.jsx';
export { DishDetailModal } from './DishDetailModal.jsx';
export { HelpMeChooseModal } from './HelpMeChooseModal.jsx';
export { MenuConciergeModal } from './MenuConciergeModal.jsx';
export { ComparisonModal } from './ComparisonModal.jsx';
export { FilterSheet, EMPTY_FILTERS } from './FilterSheet.jsx';
export { ShortlistDrawer } from './ShortlistDrawer.jsx';
export { BottomNavBar } from './BottomNavBar.jsx';
export { FeaturedDishSection } from './FeaturedDishSection.jsx';
export { MenuEntrySplash } from './MenuEntrySplash.jsx';
