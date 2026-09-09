import { motion } from 'framer-motion';
import { PlateWheel } from './PlateWheel.jsx';
import { categoryBlurb, categoryDomId } from '../lib/menuUtils.js';
import { useCategoryAttention } from '../../analytics/useCategoryAttention.js';

export function CategorySection({
  category,
  quantities,
  restaurantName = '',
  onOpenDish,
  onAdd,
  onIncrement,
  onDecrement,
  showScrollHint = false,
  flash = false,
}) {
  const headerRef = useCategoryAttention(category.id);

  return (
    <motion.section
      id={categoryDomId(category.id)}
      data-category-id={category.id}
      className="scroll-mt-[calc(var(--g-header-h)+0.85rem)] px-5"
      aria-labelledby={`${categoryDomId(category.id)}-heading`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ type: 'spring', stiffness: 180, damping: 24 }}
    >
      <PlateWheel
        categoryId={category.id}
        categoryName={category.name}
        categoryDescription={categoryBlurb(category)}
        categoryHeadingId={`${categoryDomId(category.id)}-heading`}
        categoryHeaderRef={headerRef}
        dishCount={category.dishes.length}
        showScrollHint={showScrollHint}
        flash={flash}
        dishes={category.dishes}
        quantities={quantities}
        restaurantName={restaurantName}
        onOpenDish={onOpenDish}
        onAdd={onAdd}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
      />
    </motion.section>
  );
}
