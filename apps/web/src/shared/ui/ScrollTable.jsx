/**
 * Scrollable table shell — keeps page from horizontal-scrolling while
 * dense tables remain usable on narrow screens.
 */
export function ScrollTable({ children, className = '', minWidthClass = 'min-w-[36rem]' }) {
  return (
    <div className={['-mx-1 overflow-x-auto overscroll-x-contain sm:mx-0', className].filter(Boolean).join(' ')}>
      <div className={minWidthClass}>{children}</div>
    </div>
  );
}
