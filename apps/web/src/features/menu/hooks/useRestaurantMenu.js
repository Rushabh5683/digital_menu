import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/api/client.js';

export function useRestaurantMenu(restaurantSlug) {
  return useQuery({
    queryKey: ['menu', restaurantSlug],
    queryFn: () => api.getRestaurantMenu(restaurantSlug),
    enabled: Boolean(restaurantSlug),
  });
}
