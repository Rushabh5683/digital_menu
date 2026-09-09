import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Dish, RestaurantConfig } from './types';
import { RESTAURANT_CONFIG, CATEGORIES, DISHES } from './data/restaurantData';
import { tracker } from './services/eventTracker';
import { interpretSearchQuery } from './services/searchAndRecommendation';

// Components
import { RestaurantHeader } from './components/RestaurantHeader';
import { WelcomeSection } from './components/WelcomeSection';
import { CategoryNav } from './components/CategoryNav';
import { SearchBar } from './components/SearchBar';
import { SearchResultsView } from './components/SearchResultsView';
import { CategoryDishRail } from './components/CategoryDishRail';
import { DishCard } from './components/DishCard';
import { DishDetailModal } from './components/DishDetailModal';
import { HelpMeChooseModal } from './components/HelpMeChooseModal';
import { ComparisonModal } from './components/ComparisonModal';
import { MenuConciergeModal } from './components/MenuConciergeModal';
import { FilterSheet, FilterState } from './components/FilterSheet';
import { ShortlistDrawer } from './components/ShortlistDrawer';
import { BottomNavBar } from './components/BottomNavBar';
import { Scale, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // App & Restaurant Config State
  const [config, setConfig] = useState<RestaurantConfig>(RESTAURANT_CONFIG);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers State
  const [selectedDishForDetail, setSelectedDishForDetail] = useState<Dish | null>(null);
  const [comparisonPair, setComparisonPair] = useState<[Dish, Dish] | null>(null);
  const [isHelpMeChooseOpen, setIsHelpMeChooseOpen] = useState<boolean>(false);
  const [isConciergeOpen, setIsConciergeOpen] = useState<boolean>(false);
  const [isShortlistOpen, setIsShortlistOpen] = useState<boolean>(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState<boolean>(false);

  // Shortlist State (Dish ID -> Quantity)
  const [shortlistMap, setShortlistMap] = useState<{ [dishId: string]: number }>({});

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    dietary: [],
    spiceLevels: [],
    richness: [],
    portion: [],
  });

  // Active filter count
  const activeFilterCount =
    filters.dietary.length + filters.spiceLevels.length + filters.richness.length + filters.portion.length;

  // Shortlist item objects
  const shortlistItems = useMemo(() => {
    return Object.entries(shortlistMap)
      .map(([id, qty]) => {
        const dish = DISHES.find((d) => d.id === id);
        return dish ? { dish, quantity: qty } : null;
      })
      .filter((item): item is { dish: Dish; quantity: number } => Boolean(item));
  }, [shortlistMap]);

  const shortlistIds = useMemo(() => new Set(Object.keys(shortlistMap)), [shortlistMap]);

  // Track active category during vertical scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY < 250) {
        setActiveCategoryId('all');
        return;
      }

      for (const cat of CATEGORIES) {
        const el = document.getElementById(`section-${cat.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 100) {
            setActiveCategoryId(cat.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Search results interpretation
  const searchResult = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const res = interpretSearchQuery(searchQuery);

    if (res.isZeroResult) {
      tracker.track('ZERO_RESULT_SEARCH', { searchQuery });
    } else {
      tracker.track('SEARCH_PERFORMED', {
        searchQuery,
        context: { resultCount: res.results.length },
      });
    }

    return res;
  }, [searchQuery]);

  // Handle Mood selection
  const handleSelectMood = (mood: string | null) => {
    setActiveMood(mood);
    if (mood) {
      tracker.track('PREFERENCE_SELECTED', {
        intent: { mood },
      });
    }
  };

  // Handle Category anchor jump
  const handleSelectCategory = (catId: string) => {
    setActiveCategoryId(catId);
    tracker.track('CATEGORY_VIEWED', {
      categoryId: catId,
    });
  };

  // Shortlist helpers
  const handleToggleShortlist = (dish: Dish, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setShortlistMap((prev) => {
      const next = { ...prev };
      if (next[dish.id]) {
        delete next[dish.id];
      } else {
        next[dish.id] = 1;
        tracker.track('SHORTLIST_ITEM_ADDED', {
          dishId: dish.id,
          dishName: dish.name,
          context: { price: dish.price },
        });
      }
      return next;
    });
  };

  const handleUpdateQuantity = (dishId: string, delta: number) => {
    setShortlistMap((prev) => {
      const current = prev[dishId] || 0;
      const nextVal = current + delta;
      const next = { ...prev };
      if (nextVal <= 0) {
        delete next[dishId];
      } else {
        next[dishId] = nextVal;
      }
      return next;
    });
  };

  const handleRemoveShortlistItem = (dishId: string) => {
    setShortlistMap((prev) => {
      const next = { ...prev };
      delete next[dishId];
      return next;
    });
  };

  // Compare helpers
  const handleToggleCompare = (dish: Dish, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!comparisonPair) {
      const counterpart =
        dish.similarDishIds.length > 0
          ? DISHES.find((d) => d.id === dish.similarDishIds[0]) || DISHES.find((d) => d.id !== dish.id)!
          : DISHES.find((d) => d.id !== dish.id)!;

      const newPair: [Dish, Dish] = [dish, counterpart];
      setComparisonPair(newPair);

      tracker.track('DISH_COMPARED', {
        dishId: dish.id,
        dishName: dish.name,
        comparisonPair: [dish.name, counterpart.name],
      });
    } else {
      if (comparisonPair[0].id === dish.id || comparisonPair[1].id === dish.id) {
        setComparisonPair(null);
      } else {
        const newPair: [Dish, Dish] = [comparisonPair[0], dish];
        setComparisonPair(newPair);
        tracker.track('DISH_COMPARED', {
          dishId: dish.id,
          dishName: dish.name,
          comparisonPair: [newPair[0].name, newPair[1].name],
        });
      }
    }
  };

  const handleOpenDetail = (dish: Dish) => {
    setSelectedDishForDetail(dish);
    tracker.track('DISH_VIEWED', {
      dishId: dish.id,
      dishName: dish.name,
      context: { category: dish.category, price: dish.price, available: dish.availability },
    });
  };

  // Filtered dishes calculation
  const filterDish = (dish: Dish) => {
    // Mood filter
    if (activeMood === 'light' && dish.richness !== 'Light' && dish.category !== 'starters') {
      return false;
    }
    if (activeMood === 'filling' && dish.richness !== 'Rich' && dish.category !== 'mains' && dish.category !== 'biryani-rice') {
      return false;
    }
    if (activeMood === 'spicy' && dish.spiceLevel < 2) {
      return false;
    }
    if (activeMood === 'vegetarian' && !dish.dietaryTags.includes('Vegetarian')) {
      return false;
    }
    if (activeMood === 'chef' && !dish.isChefRecommended) {
      return false;
    }
    if (activeMood === 'popular' && !dish.isPopular) {
      return false;
    }

    // Dietary filter sheet
    if (filters.dietary.length > 0) {
      const hasAllTags = filters.dietary.every((tag) => dish.dietaryTags.includes(tag));
      if (!hasAllTags) return false;
    }

    // Spice level filter sheet
    if (filters.spiceLevels.length > 0) {
      if (!filters.spiceLevels.includes(dish.spiceLevel)) return false;
    }

    // Richness filter sheet
    if (filters.richness.length > 0) {
      if (!filters.richness.includes(dish.richness)) return false;
    }

    // Portion filter sheet
    if (filters.portion.length > 0) {
      if (!filters.portion.includes(dish.portion)) return false;
    }

    return true;
  };

  const displayedDishes = useMemo(() => {
    return DISHES.filter(filterDish);
  }, [activeMood, filters]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 selection:bg-[#E0CDA9] selection:text-stone-900 pb-24 sm:pb-16">
      {/* 1. Header (Zero customer telemetry) */}
      <RestaurantHeader
        config={config}
        shortlistCount={shortlistItems.length}
        onOpenShortlist={() => {
          setIsShortlistOpen(true);
          tracker.track('SHORTLIST_VIEWED');
        }}
        onOpenConcierge={() => {
          setIsConciergeOpen(true);
          tracker.track('ASSISTANT_OPENED');
        }}
        onLanguageChange={(lang) => setConfig((c) => ({ ...c, currentLanguage: lang }))}
      />

      {/* 2. Welcome & Mood Section */}
      <WelcomeSection
        activeMood={activeMood}
        onSelectMood={handleSelectMood}
        onOpenHelpMeChoose={() => {
          setIsHelpMeChooseOpen(true);
          tracker.track('HELP_ME_CHOOSE_STARTED');
        }}
      />

      {/* 3. Search Bar with Intent Prompts */}
      <SearchBar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onOpenFilterSheet={() => setIsFilterSheetOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* 4. Active Comparison Floating Bar (if 2 dishes selected) */}
      {comparisonPair && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-4">
          <div className="p-3 bg-stone-900 text-stone-50 rounded-sm flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2 text-xs">
              <Scale className="w-4 h-4 text-[#C5A880]" />
              <span className="font-serif font-medium text-sm">
                Comparing: {comparisonPair[0].name} vs {comparisonPair[1].name}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setComparisonPair(null)}
                className="text-xs text-stone-400 hover:text-stone-200 px-2 py-1 cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  tracker.track('COMPARISON_COMPLETED', {
                    comparisonPair: [comparisonPair[0].name, comparisonPair[1].name],
                  });
                }}
                className="px-3 py-1 bg-[#9A7B4F] text-white text-xs font-medium rounded-sm hover:bg-[#866940] transition-colors cursor-pointer"
              >
                View Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Main Content: Search Results vs Continuous Vertical Menu */}
      {searchResult ? (
        <SearchResultsView
          searchResult={searchResult}
          shortlistIds={shortlistIds}
          comparisonPair={comparisonPair ? [comparisonPair[0].id, comparisonPair[1].id] : null}
          onOpenDetail={handleOpenDetail}
          onToggleShortlist={handleToggleShortlist}
          onToggleCompare={handleToggleCompare}
          onClearSearch={() => setSearchQuery('')}
          onRecoveryDishClicked={(dish) => {
            tracker.track('SEARCH_RECOVERY_CLICKED', {
              dishId: dish.id,
              dishName: dish.name,
              searchQuery,
            });
          }}
        />
      ) : (
        <>
          {/* Sticky Anchor/Jump Course Nav */}
          <CategoryNav
            categories={CATEGORIES}
            activeCategoryId={activeCategoryId}
            onSelectCategory={handleSelectCategory}
          />

          {/* Continuous Vertical Menu Flow */}
          <main id="menu-content-top" className="max-w-5xl mx-auto py-6 sm:py-10">
            {/* Filter Active Notice if any */}
            {(activeMood || activeFilterCount > 0) && (
              <div className="mx-4 sm:mx-6 mb-8 p-3 bg-stone-100/90 border border-stone-200/80 rounded-sm flex items-center justify-between text-xs text-stone-700">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-[#9A7B4F] uppercase tracking-wider text-[11px]">Filtered:</span>
                  <span>{displayedDishes.length} dishes matched</span>
                </div>
                <button
                  onClick={() => {
                    setActiveMood(null);
                    setFilters({ dietary: [], spiceLevels: [], richness: [], portion: [] });
                  }}
                  className="text-xs text-[#9A7B4F] hover:underline font-medium cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            )}

            {/* Vertically Stacked Categories with Horizontal Dish Rails */}
            <div className="space-y-10 sm:space-y-14">
              {CATEGORIES.map((cat) => {
                const catDishes = displayedDishes.filter((d) => d.category === cat.id);
                if (catDishes.length === 0) return null;

                return (
                  <CategoryDishRail
                    key={cat.id}
                    category={cat}
                    dishes={catDishes}
                    shortlistIds={shortlistIds}
                    comparisonPair={comparisonPair ? [comparisonPair[0].id, comparisonPair[1].id] : null}
                    onOpenDetail={handleOpenDetail}
                    onToggleShortlist={handleToggleShortlist}
                    onToggleCompare={handleToggleCompare}
                  />
                );
              })}
            </div>

            {displayedDishes.length === 0 && (
              <div className="p-10 text-center bg-stone-50 rounded-sm border border-stone-200/60 text-stone-500 my-8">
                <p className="text-base font-serif">No dishes match your active preference filters.</p>
                <button
                  onClick={() => {
                    setActiveMood(null);
                    setFilters({ dietary: [], spiceLevels: [], richness: [], portion: [] });
                  }}
                  className="mt-3 text-xs text-[#9A7B4F] underline cursor-pointer font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </main>
        </>
      )}

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 py-10 border-t border-stone-200/70 text-center sm:text-left text-xs text-stone-500 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-serif font-medium text-stone-800 text-sm tracking-widest uppercase block">
              {config.name} · Mayfair London
            </span>
            <span className="text-[11px] text-stone-400">
              All dishes are freshly prepared over woodfire and embers. Please inform your server of severe allergies.
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-stone-600">
            <span>Halal Certified Meats</span>
            <span className="text-stone-300">·</span>
            <span>Sustainable Line-Caught Seafood</span>
            <span className="text-stone-300">·</span>
            <span>Table 14</span>
          </div>
        </div>
      </footer>

      {/* Modals & Dialogs */}

      {/* Dish Detail Modal */}
      <DishDetailModal
        dish={selectedDishForDetail}
        allDishes={DISHES}
        isShortlisted={selectedDishForDetail ? shortlistIds.has(selectedDishForDetail.id) : false}
        isCompared={selectedDishForDetail && comparisonPair ? comparisonPair.some((d) => d.id === selectedDishForDetail.id) : false}
        onClose={() => setSelectedDishForDetail(null)}
        onToggleShortlist={(d) => handleToggleShortlist(d)}
        onToggleCompare={(d) => handleToggleCompare(d)}
        onSelectDish={(d) => handleOpenDetail(d)}
        onIngredientTapped={(ing) => {
          tracker.track('INGREDIENT_TAPPED', {
            dishId: selectedDishForDetail?.id,
            dishName: selectedDishForDetail?.name,
            context: { ingredient: ing.name },
          });
        }}
      />

      {/* "Help Me Choose" Concierge Modal */}
      <HelpMeChooseModal
        isOpen={isHelpMeChooseOpen}
        onClose={() => setIsHelpMeChooseOpen(false)}
        onSelectDish={(d) => handleOpenDetail(d)}
        onCompleted={() => {
          tracker.track('HELP_ME_CHOOSE_COMPLETED');
        }}
      />

      {/* Side-by-Side Dish Comparison Modal */}
      {comparisonPair && (
        <ComparisonModal
          pair={comparisonPair}
          allDishes={DISHES}
          shortlistIds={shortlistIds}
          onClose={() => setComparisonPair(null)}
          onOpenDishDetail={(d) => handleOpenDetail(d)}
          onToggleShortlist={(d) => handleToggleShortlist(d)}
          onChangeDish={(slot, newDish) => {
            const nextPair: [Dish, Dish] = slot === 0 ? [newDish, comparisonPair[1]] : [comparisonPair[0], newDish];
            setComparisonPair(nextPair);
          }}
        />
      )}

      {/* Menu Concierge Assistant Modal */}
      <MenuConciergeModal
        isOpen={isConciergeOpen}
        onClose={() => setIsConciergeOpen(false)}
        onSelectDish={(d) => handleOpenDetail(d)}
        onQuestionAsked={(q) => {
          tracker.track('ASSISTANT_QUESTION_ASKED', {
            context: { question: q },
          });
        }}
      />

      {/* Filter Sheet Modal */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        filters={filters}
        onClose={() => setIsFilterSheetOpen(false)}
        onUpdateFilters={(newFilters) => {
          setFilters(newFilters);
          tracker.track('FILTER_APPLIED', {
            context: newFilters,
          });
        }}
        onResetFilters={() =>
          setFilters({ dietary: [], spiceLevels: [], richness: [], portion: [] })
        }
      />

      {/* Shortlist / Table Picks Drawer */}
      <ShortlistDrawer
        isOpen={isShortlistOpen}
        shortlist={shortlistItems}
        allDishes={DISHES}
        onClose={() => setIsShortlistOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveShortlistItem}
        onClearAll={() => setShortlistMap({})}
        onSelectDish={(d) => handleOpenDetail(d)}
      />

      {/* Mobile Persistent Bottom Bar */}
      <BottomNavBar
        shortlistCount={shortlistItems.length}
        hasComparison={Boolean(comparisonPair)}
        onOpenMenu={() => {
          setSearchQuery('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenConcierge={() => {
          setIsConciergeOpen(true);
          tracker.track('ASSISTANT_OPENED');
        }}
        onOpenHelpMeChoose={() => {
          setIsHelpMeChooseOpen(true);
          tracker.track('HELP_ME_CHOOSE_STARTED');
        }}
        onOpenComparison={() => {
          if (!comparisonPair) {
            setComparisonPair([DISHES[0], DISHES[1]]);
          }
        }}
        onOpenShortlist={() => {
          setIsShortlistOpen(true);
          tracker.track('SHORTLIST_VIEWED');
        }}
      />
    </div>
  );
};

export default App;
