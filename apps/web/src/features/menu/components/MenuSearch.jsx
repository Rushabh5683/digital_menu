import { Search, X } from 'lucide-react';

export function MenuSearch({ value, onChange, inputRef }) {
  return (
    <label className="relative block flex-1">
      <span className="sr-only">Search the menu</span>
      <Search
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
      />
      <input
        ref={inputRef}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search dishes, ingredients…"
        className="w-full rounded-2xl border-0 bg-[#f3f1ec] py-3.5 pl-11 pr-11 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--teal)]/20"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      ) : null}
    </label>
  );
}
