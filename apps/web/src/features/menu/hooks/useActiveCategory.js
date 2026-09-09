import { useEffect, useState } from 'react';
import { categoryDomId } from '../lib/menuUtils.js';

export function useActiveCategory(categories, enabled = true) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? null);

  useEffect(() => {
    if (!enabled || categories.length === 0) return undefined;

    setActiveCategoryId(categories[0].id);

    const elements = categories
      .map((category) => document.getElementById(categoryDomId(category.id)))
      .filter(Boolean);

    if (elements.length === 0) return undefined;

    const visibility = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        let bestId = null;
        let bestRatio = 0;

        for (const category of categories) {
          const id = categoryDomId(category.id);
          const ratio = visibility.get(id) || 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = category.id;
          }
        }

        if (bestId) {
          setActiveCategoryId(bestId);
        }
      },
      {
        root: null,
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [categories, enabled]);

  return activeCategoryId;
}

function flashSectionHeader(categoryId) {
  const section = document.getElementById(categoryDomId(categoryId));
  if (!section) return;
  const target = section.querySelector('.mb-4');
  if (!target) return;
  target.classList.remove('guest-section-flash');
  void target.offsetWidth;
  target.classList.add('guest-section-flash');
  window.setTimeout(() => target.classList.remove('guest-section-flash'), 900);
}

export function scrollToCategory(categoryId) {
  const element = document.getElementById(categoryDomId(categoryId));
  if (!element) return;

  const nav = document.getElementById('menu-category-nav');
  const headerH =
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--g-header-h'),
    ) || 0;
  const navHeight = nav ? nav.getBoundingClientRect().height : 52;
  const offset = (headerH || 0) + navHeight + 10;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  window.setTimeout(() => flashSectionHeader(categoryId), 320);
}

export function findCategoryById(categories, categoryId) {
  return categories.find((category) => category.id === categoryId) || null;
}
