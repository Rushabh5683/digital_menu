import { useEffect } from 'react';
import { Check } from 'lucide-react';

export function GuestToast({ message, open, onClose, duration = 2200 }) {
  useEffect(() => {
    if (!open || !message) return undefined;
    const timer = window.setTimeout(() => onClose?.(), duration);
    return () => window.clearTimeout(timer);
  }, [open, message, duration, onClose]);

  if (!open || !message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex justify-center px-4">
      <div className="guest-toast pointer-events-auto inline-flex max-w-sm items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#15181E]/90 px-4 py-3 text-sm font-medium text-white shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-xl">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-black">
          <Check size={14} strokeWidth={2.6} />
        </span>
        <span className="leading-snug">{message}</span>
      </div>
    </div>
  );
}
