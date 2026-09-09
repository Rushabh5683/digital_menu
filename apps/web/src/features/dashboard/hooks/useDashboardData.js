import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client.js';
import { getDateRangePreset, withAttentionShare } from '../lib/format.js';

export function useDashboardData(restaurantSlug, rangePreset = 'all') {
  const range = useMemo(() => getDateRangePreset(rangePreset), [rangePreset]);

  const restaurantQuery = useQuery({
    queryKey: ['restaurant', restaurantSlug],
    queryFn: async () => {
      const payload = await api.getRestaurant(restaurantSlug);
      return payload.restaurant;
    },
    enabled: Boolean(restaurantSlug),
  });

  const restaurantId = restaurantQuery.data?.id;
  const params = useMemo(
    () => ({
      ...(range.from ? { from: range.from } : {}),
      ...(range.to ? { to: range.to } : {}),
    }),
    [range.from, range.to],
  );

  const overviewQuery = useQuery({
    queryKey: ['analytics', 'overview', restaurantId, params],
    queryFn: () => api.getAnalyticsOverview(restaurantId, params),
    enabled: Boolean(restaurantId),
  });

  const categoriesQuery = useQuery({
    queryKey: ['analytics', 'categories', restaurantId, params],
    queryFn: () => api.getAnalyticsCategories(restaurantId, params),
    enabled: Boolean(restaurantId),
  });

  const dishesQuery = useQuery({
    queryKey: ['analytics', 'dishes', restaurantId, params],
    queryFn: () => api.getAnalyticsDishes(restaurantId, params),
    enabled: Boolean(restaurantId),
  });

  const insightsQuery = useQuery({
    queryKey: ['insights', restaurantId, params],
    queryFn: () => api.getInsights(restaurantId, params),
    enabled: Boolean(restaurantId),
  });

  const isLoading =
    restaurantQuery.isLoading ||
    (Boolean(restaurantId) &&
      (overviewQuery.isLoading ||
        categoriesQuery.isLoading ||
        dishesQuery.isLoading ||
        insightsQuery.isLoading));

  const isFetching =
    restaurantQuery.isFetching ||
    overviewQuery.isFetching ||
    categoriesQuery.isFetching ||
    dishesQuery.isFetching ||
    insightsQuery.isFetching;

  const error =
    restaurantQuery.error ||
    overviewQuery.error ||
    categoriesQuery.error ||
    dishesQuery.error ||
    insightsQuery.error;

  const categories = withAttentionShare(categoriesQuery.data?.categories ?? []);
  const dishes = dishesQuery.data?.dishes ?? [];
  const overview = overviewQuery.data ?? null;
  const insights = insightsQuery.data?.insights ?? [];

  const isEmpty =
    !isLoading &&
    !error &&
    overview &&
    overview.totalMenuSessions === 0 &&
    categories.every((category) => category.totalViews === 0 && category.totalAttentionSeconds === 0);

  return {
    restaurant: restaurantQuery.data ?? null,
    overview,
    categories,
    dishes,
    insights,
    highAttentionLowSelection: dishesQuery.data?.highAttentionLowSelection ?? [],
    range,
    isLoading,
    isFetching,
    isEmpty,
    error,
    refetch: () => {
      restaurantQuery.refetch();
      overviewQuery.refetch();
      categoriesQuery.refetch();
      dishesQuery.refetch();
      insightsQuery.refetch();
    },
  };
}
