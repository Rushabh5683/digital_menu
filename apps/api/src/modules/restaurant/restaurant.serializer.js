export function serializeRestaurant(restaurant, { publicView = false } = {}) {
  const base = {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description,
    logo: restaurant.logoUrl,
    status: restaurant.status ?? null,
  };

  // Public guest payloads omit contact PII (email/phone) but keep brand + address for welcome.
  if (publicView) {
    return {
      ...base,
      brandTagline: restaurant.brandTagline ?? null,
      brandAccent: restaurant.brandAccent ?? null,
      address: restaurant.address ?? null,
    };
  }

  return {
    ...base,
    email: restaurant.email ?? null,
    phone: restaurant.phone ?? null,
    address: restaurant.address ?? null,
  };
}

export function serializeRestaurantSummary(restaurant) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description,
    logo: restaurant.logoUrl,
    brandTagline: restaurant.brandTagline ?? null,
    brandAccent: restaurant.brandAccent ?? null,
    address: restaurant.address ?? null,
    status: restaurant.status ?? null,
    gstEnabled: Boolean(restaurant.gstEnabled),
    cgstRate: Number(restaurant.cgstRate ?? 0),
    sgstRate: Number(restaurant.sgstRate ?? 0),
  };
}
