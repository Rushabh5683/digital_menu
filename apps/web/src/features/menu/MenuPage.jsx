import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { FloatingCartBar } from './components/FloatingCartBar.jsx';
import { GuestToast } from './components/GuestToast.jsx';
import { MenuEmptySearch, MenuErrorState, MenuLoadingState } from './components/MenuStates.jsx';
import { TablePicker } from './components/TablePicker.jsx';
import { CartDrawer } from './cart/CartUI.jsx';
import { MyOrderDrawer } from './cart/OrderStatusPanel.jsx';
import { useCart } from './cart/useCart.js';
import { useMyOrder } from './cart/useMyOrder.js';
import { useRestaurantMenu } from './hooks/useRestaurantMenu.js';
import { computeExclusiveGst } from '../../shared/lib/gst.js';
import { useAnonymousSession } from '../tracking/useAnonymousSession.js';
import {
  clearStoredTable,
  getStoredTable,
  saveStoredTable,
} from '../tracking/tableContext.js';
import {
  initAnalytics,
  markMenuOpened,
  shutdownAnalytics,
  trackCategoryNavTap,
  trackDishInfoViewed,
  trackDishSelection,
  trackFilterApplied,
  trackFilterCleared,
  trackMenuDiscovery,
  commitMenuDiscovery,
  trackExperienceEvent,
} from '../analytics/analytics.js';
import { EventTypes } from '../analytics/eventTypes.js';
import {
  BottomNavBar,
  CategoryDishRail,
  ComparisonModal,
  DishDetailModal,
  ExperienceCategoryNav,
  ExperienceHeader,
  ExperienceSearchBar,
  FeaturedDishSection,
  FilterSheet,
  HelpMeChooseModal,
  MenuEntrySplash,
  SearchResultsView,
  ShortlistDrawer,
  WelcomeSection,
  enrichMenu,
  interpretSearchQuery,
  matchesFilters,
} from './experience/index.js';

function parseTableParam(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) return null;
  return num;
}

function countActiveFilters(filters) {
  return (
    (filters.dietary?.length || 0) +
    (filters.spiceLevels?.length || 0) +
    (filters.richness?.length || 0) +
    (filters.portion?.length || 0)
  );
}

export function MenuPage() {
  const { restaurantSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const qrTableNumber = parseTableParam(searchParams.get('table'));
  const searchInputRef = useRef(null);

  const [pickedTable, setPickedTable] = useState(() =>
    restaurantSlug ? getStoredTable(restaurantSlug) : null,
  );
  const [needsPicker, setNeedsPicker] = useState(false);

  const [cartOpen, setCartOpen] = useState(false);
  const [myOrderOpen, setMyOrderOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '' });

  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(() => ({
    dietary: [],
    spiceLevels: [],
    richness: [],
    portion: [],
  }));

  const [selectedDish, setSelectedDish] = useState(null);
  const [comparisonPair, setComparisonPair] = useState(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [shortlistMap, setShortlistMap] = useState({});
  const [showEntrySplash, setShowEntrySplash] = useState(true);
  const [menuFadeIn, setMenuFadeIn] = useState(false);

  useEffect(() => {
    setShowEntrySplash(true);
    setMenuFadeIn(false);
  }, [restaurantSlug]);

  const effectiveTableNumber = qrTableNumber || pickedTable?.tableNumber || null;

  const { data, isLoading, isError, error, refetch, isFetching } = useRestaurantMenu(restaurantSlug);
  const { session, status: sessionStatus } = useAnonymousSession(restaurantSlug, {
    enabled: Boolean(restaurantSlug),
    tableNumber: effectiveTableNumber,
  });

  const rawCategories = data?.menu?.categories ?? [];
  const popularIds = useMemo(
    () => (data?.guestFavourites || []).map((d) => d.id).filter(Boolean),
    [data?.guestFavourites],
  );

  const { categories, dishes } = useMemo(
    () => enrichMenu(rawCategories, { popularIds }),
    [rawCategories, popularIds],
  );

  const dishesById = useMemo(() => {
    const map = new Map();
    for (const dish of dishes) map.set(dish.id, dish);
    return map;
  }, [dishes]);

  const tableLabel =
    session?.tableLabel ||
    (effectiveTableNumber
      ? `Table ${String(effectiveTableNumber).padStart(2, '0')}`
      : 'Your table');

  const {
    cart,
    addDish,
    increment,
    decrement,
    removeDish,
    clear,
  } = useCart({
    restaurantId: data?.restaurant?.id || session?.restaurantId,
    restaurantSlug,
    restaurantName: data?.restaurant?.name,
    tableNumber: effectiveTableNumber || session?.tableNumber,
    tableLabel,
    anonymousSessionId: session?.anonymousSessionId,
    dishesById,
  });

  const {
    order: myOrder,
    hasActiveOrder,
    openOrder,
    rememberPlacedOrder,
    refresh: refreshMyOrder,
  } = useMyOrder({
    restaurantId: data?.restaurant?.id || session?.restaurantId,
    restaurantSlug,
    anonymousSessionId: session?.anonymousSessionId,
    tableNumber: effectiveTableNumber || session?.tableNumber,
    enabled: Boolean(session?.anonymousSessionId),
  });

  const activeFilterCount = countActiveFilters(filters);

  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => ({
        ...category,
        dishes: (category.dishes || []).filter((dish) => {
          if (!matchesFilters(dish, filters)) return false;
          return true;
        }),
      }))
      .filter((category) => category.dishes.length > 0);
  }, [categories, filters]);

  const filteredDishCount = useMemo(
    () => filteredCategories.reduce((sum, cat) => sum + cat.dishes.length, 0),
    [filteredCategories],
  );

  const searchResult = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return interpretSearchQuery(searchQuery, dishes);
  }, [searchQuery, dishes]);

  const shortlistItems = useMemo(() => {
    return Object.entries(shortlistMap)
      .map(([id, quantity]) => {
        const dish = dishesById.get(id);
        return dish ? { dish, quantity } : null;
      })
      .filter(Boolean);
  }, [shortlistMap, dishesById]);

  const shortlistIds = useMemo(() => new Set(Object.keys(shortlistMap)), [shortlistMap]);

  const signatureDishes = useMemo(
    () => dishes.filter((d) => d.isSignature && d.availability).slice(0, 4),
    [dishes],
  );

  const isFiltering = activeFilterCount > 0;

  useEffect(() => {
    if (!restaurantSlug) return;

    if (qrTableNumber) {
      saveStoredTable(restaurantSlug, {
        tableNumber: qrTableNumber,
        source: 'qr',
      });
      setPickedTable({ tableNumber: qrTableNumber, source: 'qr' });
      setNeedsPicker(false);
      return;
    }

    const stored = getStoredTable(restaurantSlug);
    if (stored?.tableNumber) {
      setPickedTable(stored);
      setNeedsPicker(false);
      return;
    }

    setNeedsPicker(true);
  }, [restaurantSlug, qrTableNumber]);

  useEffect(() => {
    if (!restaurantSlug || sessionStatus !== 'ready' || !session?.sessionId) {
      return undefined;
    }

    initAnalytics(restaurantSlug);
    markMenuOpened();

    return () => {
      shutdownAnalytics({ reason: 'leave_menu' });
    };
  }, [restaurantSlug, sessionStatus, session?.sessionId]);

  useEffect(() => {
    if (!searchQuery.trim() || sessionStatus !== 'ready' || !session?.sessionId) return;
    const resultCount = searchResult?.results?.length ?? 0;
    trackMenuDiscovery({
      query: searchQuery,
      filters: filters.dietary,
      resultCount,
    });
  }, [searchQuery, filters.dietary, searchResult, sessionStatus, session?.sessionId]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 250) {
        setActiveCategoryId('all');
        return;
      }
      for (const cat of filteredCategories) {
        const el = document.getElementById(`section-${cat.id}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 200 && rect.bottom >= 100) {
          setActiveCategoryId(cat.id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredCategories]);

  function handlePickTable(table) {
    saveStoredTable(restaurantSlug, {
      tableNumber: table.tableNumber,
      tableId: table.id,
      source: 'picker',
    });
    setPickedTable({
      tableNumber: table.tableNumber,
      tableId: table.id,
      source: 'picker',
    });
    setNeedsPicker(false);
    const next = new URLSearchParams(searchParams);
    next.set('table', String(table.tableNumber));
    setSearchParams(next, { replace: true });
  }

  function showAddedToast(dishName) {
    setToast({ open: true, message: `${dishName} added to your order` });
  }

  function openDish(dish) {
    if (!dish) return;
    setSelectedDish(dish);
    trackDishInfoViewed(dish, dish.categoryId || dish.category, {
      sections: ['overview', 'ingredients', 'dietary', 'similar'],
      source: 'experience_detail',
    });
  }

  function handleSelectCategory(catId) {
    setActiveCategoryId(catId);
    trackCategoryNavTap(catId, { source: 'experience_category_nav' });
    if (catId === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(`section-${catId}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  function handleToggleShortlist(dish, event) {
    event?.stopPropagation?.();
    if (!dish?.id) return;
    setShortlistMap((prev) => {
      const next = { ...prev };
      if (next[dish.id]) {
        delete next[dish.id];
        trackExperienceEvent(EventTypes.SHORTLIST_ITEM_REMOVED, {
          dishId: dish.id,
          metadata: { name: dish.name },
        });
      } else {
        next[dish.id] = 1;
        trackExperienceEvent(EventTypes.SHORTLIST_ITEM_ADDED, {
          dishId: dish.id,
          metadata: { name: dish.name, price: dish.price },
        });
      }
      return next;
    });
  }

  function handleUpdateShortlistQty(dishId, delta) {
    setShortlistMap((prev) => {
      const current = prev[dishId] || 0;
      const nextVal = current + delta;
      const next = { ...prev };
      if (nextVal <= 0) delete next[dishId];
      else next[dishId] = nextVal;
      return next;
    });
  }

  function handleToggleCompare(dish, event) {
    event?.stopPropagation?.();
    if (!dish) return;

    trackExperienceEvent(EventTypes.DISH_COMPARED, {
      dishId: dish.id,
      metadata: { name: dish.name },
    });

    setComparisonPair((prev) => {
      if (!prev) {
        const similar =
          dishes.find(
            (d) =>
              d.id === dish.similarDishIds?.[0] &&
              d.id !== dish.id &&
              String(d.categoryId || d.category) === String(dish.categoryId || dish.category),
          ) ||
          dishes.find(
            (d) =>
              d.id !== dish.id &&
              String(d.categoryId || d.category) === String(dish.categoryId || dish.category),
          );
        if (!similar) return [dish, dish];
        setShowComparisonModal(true);
        return [dish, similar];
      }
      if (prev[0]?.id === dish.id || prev[1]?.id === dish.id) {
        setShowComparisonModal(false);
        return null;
      }
      setShowComparisonModal(true);
      return [prev[0], dish];
    });
  }

  function handleUpdateFilters(next) {
    const previousCount = activeFilterCount;
    setFilters(next);
    const nextCount = countActiveFilters(next);
    if (nextCount > previousCount) {
      trackFilterApplied('experience_filter', {
        activeFilters: [
          ...next.dietary,
          ...next.spiceLevels.map((l) => `spice:${l}`),
          ...next.richness,
          ...next.portion,
        ],
        resultCount: filteredDishCount,
      });
      trackExperienceEvent(EventTypes.FILTER_APPLIED, {
        metadata: { filters: next, resultCount: filteredDishCount },
      });
    } else if (nextCount === 0 && previousCount > 0) {
      trackFilterCleared({
        previousFilters: [
          ...filters.dietary,
          ...filters.spiceLevels.map((l) => `spice:${l}`),
        ],
        resultCount: dishes.length,
      });
    }
  }

  function handleResetFilters() {
    if (activeFilterCount > 0) {
      trackFilterCleared({
        previousFilters: filters.dietary,
        resultCount: dishes.length,
      });
    }
    setFilters({
      dietary: [],
      spiceLevels: [],
      richness: [],
      portion: [],
    });
  }

  function handleSearchCommit() {
    if (searchQuery.trim().length < 2) return;
    commitMenuDiscovery({
      query: searchQuery,
      filters: filters.dietary,
      resultCount: searchResult?.results?.length ?? 0,
    });
    if (searchResult?.isZeroResult) {
      trackExperienceEvent(EventTypes.ZERO_RESULT_SEARCH, {
        metadata: { searchQuery },
      });
    }
  }

  function handleAddShortlistToOrder(items) {
    for (const item of items || []) {
      addDish(item.dish, item.quantity || 1);
      trackDishSelection(item.dish, item.dish.categoryId || item.dish.category);
    }
    setShortlistOpen(false);
    setCartOpen(true);
    setToast({ open: true, message: 'Picks added to your order' });
  }

  function handleAddDishToOrder(dish, quantity = 1) {
    addDish(dish, quantity);
    trackDishSelection(dish, dish.categoryId || dish.category);
    showAddedToast(dish.name);
  }

  if (isLoading || (isFetching && !data)) {
    return <MenuLoadingState />;
  }

  if (isError || !data) {
    return (
      <MenuErrorState
        message={error?.message || 'This restaurant menu could not be found.'}
        onRetry={() => refetch()}
      />
    );
  }

  const { restaurant } = data;
  const gstConfig = {
    gstEnabled: Boolean(restaurant.gstEnabled),
    cgstRate: restaurant.cgstRate,
    sgstRate: restaurant.sgstRate,
  };
  const cartDisplayTotal = computeExclusiveGst(cart.subtotal, gstConfig).total;
  const currency = restaurant.currencyCode || 'INR';

  if (needsPicker && !effectiveTableNumber) {
    return (
      <TablePicker
        restaurant={restaurant}
        restaurantSlug={restaurantSlug}
        onSelect={handlePickTable}
      />
    );
  }

  if (showEntrySplash) {
    return (
      <MenuEntrySplash
        restaurant={restaurant}
        tableLabel={tableLabel}
        onEnter={() => {
          setMenuFadeIn(true);
          setShowEntrySplash(false);
        }}
      />
    );
  }

  const bottomPad =
    cart.itemCount > 0 && comparisonPair
      ? 'pb-[16.5rem]'
      : cart.itemCount > 0 || comparisonPair
        ? 'pb-[12.5rem]'
        : 'pb-[6.5rem]';

  return (
    <div
      className={['guest-menu guest-menu--experience', bottomPad].join(' ')}
      style={
        menuFadeIn
          ? { animation: 'menu-swipe-up-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both' }
          : undefined
      }
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (menuFadeIn) setMenuFadeIn(false);
      }}
    >
      <div className="guest-experience-shell">
        <ExperienceHeader
          restaurant={restaurant}
          tableLabel={tableLabel}
          shortlistCount={shortlistItems.length}
          hasActiveOrder={Boolean(hasActiveOrder)}
          onOpenMyOrder={() => {
            refreshMyOrder();
            setMyOrderOpen(true);
          }}
          onOpenShortlist={() => {
            setShortlistOpen(true);
            trackExperienceEvent(EventTypes.SHORTLIST_VIEWED, {
              metadata: { count: shortlistItems.length },
            });
          }}
          onOpenHelpMeChoose={() => {
            setHelpOpen(true);
            trackExperienceEvent(EventTypes.HELP_ME_CHOOSE_STARTED);
          }}
        />

        <WelcomeSection
          tableLabel={tableLabel}
          tagline={restaurant.tagline || restaurant.cuisine}
          subtitle={
            restaurant.description ||
            'Browse the menu, search what you want, or get a few quick suggestions.'
          }
          onOpenHelpMeChoose={() => {
            setHelpOpen(true);
            trackExperienceEvent(EventTypes.HELP_ME_CHOOSE_STARTED);
          }}
        />

        <div ref={searchInputRef}>
          <ExperienceSearchBar
            query={searchQuery}
            onQueryChange={(value) => {
              setSearchQuery(value);
              if (!value) return;
            }}
            onOpenFilterSheet={() => setFilterSheetOpen(true)}
            activeFilterCount={activeFilterCount}
          />
        </div>

        {!searchQuery.trim() ? (
          <ExperienceCategoryNav
            categories={categories}
            activeCategoryId={activeCategoryId}
            onSelectCategory={handleSelectCategory}
          />
        ) : null}

        {isFiltering && !searchQuery.trim() ? (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2">
            <span className="text-xs text-stone-600">
              Filtered: <strong>{filteredDishCount}</strong> dishes matched
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[#9A7B4F] underline"
            >
              Reset all
            </button>
          </div>
        ) : null}

        <main id="menu-content-top" className="pb-6">
          {searchQuery.trim() ? (
            <SearchResultsView
              searchResult={searchResult}
              shortlistIds={shortlistIds}
              comparisonPair={comparisonPair}
              onOpenDetail={openDish}
              onToggleShortlist={handleToggleShortlist}
              onToggleCompare={handleToggleCompare}
              onAddToOrder={(dish) => handleAddDishToOrder(dish, 1)}
              onClearSearch={() => {
                handleSearchCommit();
                setSearchQuery('');
              }}
              onRecoveryDishClicked={(dish) => {
                trackExperienceEvent(EventTypes.SEARCH_RECOVERY_CLICKED, {
                  dishId: dish.id,
                  metadata: { searchQuery },
                });
                openDish(dish);
              }}
              currency={currency}
            />
          ) : (
            <>
              {!isFiltering && signatureDishes.length > 0 ? (
                <FeaturedDishSection
                  dishes={signatureDishes}
                  shortlistIds={shortlistIds}
                  comparisonPair={comparisonPair}
                  onOpenDetail={openDish}
                  onToggleShortlist={handleToggleShortlist}
                  onToggleCompare={handleToggleCompare}
                  onAddToOrder={(dish) => handleAddDishToOrder(dish, 1)}
                  currency={currency}
                  restaurantName={restaurant.name}
                />
              ) : null}

              {filteredCategories.length === 0 ? (
                <div className="px-4 py-10">
                  <MenuEmptySearch
                    query={'selected filters'}
                    onClear={handleResetFilters}
                    suggestedCategories={categories.slice(0, 5)}
                  />
                  <p className="mt-3 text-center text-sm text-stone-500">
                    No dishes match your active preference filters.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mx-auto mt-3 block text-sm font-semibold text-[#9A7B4F]"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="space-y-7 pt-1 sm:space-y-9">
                  {filteredCategories.map((category) => (
                    <CategoryDishRail
                      key={category.id}
                      category={category}
                      dishes={category.dishes}
                      shortlistIds={shortlistIds}
                      comparisonPair={comparisonPair}
                      onOpenDetail={openDish}
                      onToggleShortlist={handleToggleShortlist}
                      onToggleCompare={handleToggleCompare}
                      onAddToOrder={(dish) => handleAddDishToOrder(dish, 1)}
                      currency={currency}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          <footer className="px-4 pb-4 pt-8 text-center text-[11px] leading-relaxed text-stone-400">
            Please inform your server of any allergies. {tableLabel} · Digital dining experience
          </footer>
        </main>
      </div>

      {(comparisonPair || cart.itemCount > 0)
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 z-[45] mx-auto flex w-full max-w-lg flex-col gap-2 px-3"
              style={{
                bottom: 'calc(4.25rem + env(safe-area-inset-bottom, 0px))',
              }}
            >
              {comparisonPair ? (
                <div className="pointer-events-auto flex w-full items-center justify-between gap-2 rounded-full border border-[#E8DFD3] bg-white/95 px-3.5 py-2.5 shadow-[0_16px_40px_-12px_rgba(28,25,23,0.22)] backdrop-blur-md">
                  <div className="flex min-w-0 items-center gap-2 text-[11px] text-stone-700 sm:text-xs">
                    <Scale className="h-4 w-4 shrink-0 text-[#9A7B4F]" />
                    <span className="truncate">
                      Comparing: <strong>{comparisonPair[0]?.name}</strong> vs{' '}
                      <strong>{comparisonPair[1]?.name}</strong>
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="text-[11px] font-medium text-stone-500"
                      onClick={() => {
                        setComparisonPair(null);
                        setShowComparisonModal(false);
                      }}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-[#9A7B4F] px-3 py-1.5 text-[11px] font-semibold text-white"
                      onClick={() => {
                        setShowComparisonModal(true);
                        trackExperienceEvent(EventTypes.COMPARISON_COMPLETED, {
                          metadata: {
                            dishA: comparisonPair[0]?.id,
                            dishB: comparisonPair[1]?.id,
                          },
                        });
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="pointer-events-auto w-full">
                <FloatingCartBar
                  itemCount={cart.itemCount}
                  total={cartDisplayTotal}
                  items={cart.items}
                  hasOpenOrder={Boolean(openOrder)}
                  onOpen={() => setCartOpen(true)}
                />
              </div>
            </div>,
            document.body,
          )
        : null}

      <BottomNavBar
        shortlistCount={shortlistItems.length}
        hasComparison={Boolean(comparisonPair)}
        onOpenMenu={() => {
          document.getElementById('experience-category-nav')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }}
        onOpenHelpMeChoose={() => {
          setHelpOpen(true);
          trackExperienceEvent(EventTypes.HELP_ME_CHOOSE_STARTED);
        }}
        onOpenComparison={() => setShowComparisonModal(true)}
        onOpenShortlist={() => {
          setShortlistOpen(true);
          trackExperienceEvent(EventTypes.SHORTLIST_VIEWED, {
            metadata: { count: shortlistItems.length },
          });
        }}
        onFocusSearch={() => {
          const el = document.getElementById('main-search-input');
          el?.focus();
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      <GuestToast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast({ open: false, message: '' })}
      />

      <FilterSheet
        isOpen={filterSheetOpen}
        filters={filters}
        dishes={dishes}
        onClose={() => setFilterSheetOpen(false)}
        onUpdateFilters={handleUpdateFilters}
        onResetFilters={handleResetFilters}
      />

      <HelpMeChooseModal
        isOpen={helpOpen}
        dishes={dishes}
        categories={categories}
        popularIds={popularIds}
        restaurantName={restaurant.name}
        currency={currency}
        onClose={() => setHelpOpen(false)}
        onSelectDish={(dish) => {
          setHelpOpen(false);
          openDish(dish);
        }}
        onCompleted={() => {
          trackExperienceEvent(EventTypes.HELP_ME_CHOOSE_COMPLETED);
        }}
      />

      <ShortlistDrawer
        isOpen={shortlistOpen}
        shortlist={shortlistItems}
        allDishes={dishes}
        tableLabel={tableLabel}
        currency={currency}
        onClose={() => setShortlistOpen(false)}
        onUpdateQuantity={handleUpdateShortlistQty}
        onRemoveItem={(dishId) => handleUpdateShortlistQty(dishId, -999)}
        onClearAll={() => setShortlistMap({})}
        onSelectDish={(dish) => {
          setShortlistOpen(false);
          openDish(dish);
        }}
        onAddToOrder={handleAddShortlistToOrder}
      />

      {showComparisonModal && comparisonPair ? (
        <ComparisonModal
          pair={comparisonPair}
          allDishes={dishes}
          shortlistIds={shortlistIds}
          onClose={() => setShowComparisonModal(false)}
          onToggleShortlist={handleToggleShortlist}
          onChangeDish={(slot, nextDish) => {
            if (!nextDish) return;
            setComparisonPair((prev) => {
              if (!prev) return [nextDish, nextDish];
              const next = [...prev];
              next[slot] = nextDish;
              // Avoid both slots being the same dish
              if (next[0]?.id === next[1]?.id) {
                const fallback = dishes.find((d) => d.id !== nextDish.id);
                if (fallback) next[slot === 0 ? 1 : 0] = fallback;
              }
              return next;
            });
          }}
          onOpenDishDetail={(dish) => {
            setShowComparisonModal(false);
            openDish(dish);
          }}
          currency={currency}
        />
      ) : null}

      <DishDetailModal
        dish={selectedDish}
        allDishes={dishes}
        isShortlisted={selectedDish ? shortlistIds.has(selectedDish.id) : false}
        isCompared={
          selectedDish
            ? Boolean(
                comparisonPair?.some((d) => d?.id === selectedDish.id),
              )
            : false
        }
        currency={currency}
        onClose={() => setSelectedDish(null)}
        onToggleShortlist={handleToggleShortlist}
        onToggleCompare={handleToggleCompare}
        onSelectDish={openDish}
        onIngredientTapped={(ing) => {
          trackExperienceEvent(EventTypes.INGREDIENT_TAPPED, {
            dishId: selectedDish?.id,
            metadata: { ingredient: ing?.name },
          });
        }}
        onAddToOrder={(dish) => {
          handleAddDishToOrder(dish, 1);
          setSelectedDish(null);
        }}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => {
          setCartOpen(false);
          setMyOrderOpen(false);
        }}
        cart={cart}
        restaurantName={restaurant.name}
        tableLabel={tableLabel}
        tableNumber={effectiveTableNumber || session?.tableNumber}
        restaurantSlug={restaurantSlug}
        anonymousSessionId={session?.anonymousSessionId}
        openOrder={openOrder}
        gstConfig={gstConfig}
        onIncrement={increment}
        onDecrement={decrement}
        onRemove={removeDish}
        onClear={clear}
        onPlaced={(placed) => {
          rememberPlacedOrder(placed);
          refreshMyOrder();
          setMyOrderOpen(false);
        }}
      />

      <MyOrderDrawer
        open={myOrderOpen}
        onClose={() => {
          setMyOrderOpen(false);
          refreshMyOrder();
        }}
        onAddMore={() => {
          setMyOrderOpen(false);
          document.getElementById('experience-category-nav')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }}
        order={myOrder}
        restaurantName={restaurant.name}
        tableLabel={tableLabel}
        restaurantSlug={restaurantSlug}
        anonymousSessionId={session?.anonymousSessionId}
        tableNumber={effectiveTableNumber || session?.tableNumber}
      />
    </div>
  );
}
