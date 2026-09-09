import { useState } from 'react';

/**
 * Lazy dish image with blur-up skeleton placeholder.
 */
export function DishImage({
  src,
  alt = '',
  className = '',
  fallbackClassName = '',
  fallbackLabel = '',
  rounded = false,
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const roundClass = rounded ? 'rounded-full' : '';

  if (!src || failed) {
    return (
      <div
        className={[
          'guest-img-fallback flex h-full w-full items-end p-2',
          roundClass,
          fallbackClassName,
        ].join(' ')}
      >
        {fallbackLabel ? (
          <span className="line-clamp-2 text-[10px] font-medium text-[#8E929B]">{fallbackLabel}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={['relative h-full w-full overflow-hidden', roundClass].join(' ')}>
      {!loaded ? (
        <div
          className={['guest-img-skeleton absolute inset-0 animate-pulse bg-[#efe8dc]', roundClass].join(' ')}
          aria-hidden
        />
      ) : null}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={[
          'h-full w-full object-cover transition duration-500',
          roundClass,
          loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-sm scale-[1.02]',
          className,
        ].join(' ')}
      />
    </div>
  );
}
