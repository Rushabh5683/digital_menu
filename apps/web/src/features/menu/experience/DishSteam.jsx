import React from 'react';

/** Hot/savory sections that should show steam on dish imagery. */
export function categoryShowsSteam(categoryName) {
  const cat = String(categoryName || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cat) return false;
  if (/starter/.test(cat)) return true;
  if (/non\s*veg/.test(cat) && /(main|course)/.test(cat)) return true;
  if (/\bveg\b/.test(cat) && /(main|course)/.test(cat) && !/non\s*veg/.test(cat)) return true;
  return false;
}

/**
 * Rising steam wisps over hot dish photos (reuses guest-dish-steam styles).
 */
export function DishSteam({ show = false, variant = 'card' }) {
  if (!show) return null;
  return (
    <div
      className={['guest-dish-steam', variant === 'card' ? 'guest-dish-steam--card' : ''].join(' ')}
      aria-hidden
    >
      <span className="guest-dish-steam__wisp guest-dish-steam__wisp--1" />
      <span className="guest-dish-steam__wisp guest-dish-steam__wisp--2" />
      <span className="guest-dish-steam__wisp guest-dish-steam__wisp--3" />
      <span className="guest-dish-steam__wisp guest-dish-steam__wisp--4" />
    </div>
  );
}
