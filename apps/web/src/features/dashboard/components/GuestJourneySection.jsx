import { Compass, HelpCircle, MessageCircle, Sparkles, UtensilsCrossed } from 'lucide-react';
import { formatNumber } from '../lib/format.js';

const MOOD_LABELS = {
  light: 'Something light',
  filling: 'Something filling',
  spicy: 'Spicy',
  vegetarian: 'Vegetarian',
  chef: "Chef's picks",
  popular: 'Popular tonight',
};

export function GuestJourneySection({ guestJourneyReport = null }) {
  const report = guestJourneyReport || {};
  const hasActivity =
    (report.preferenceSelected || 0) +
      (report.helpMeChooseStarted || 0) +
      (report.assistantOpened || 0) +
      (report.shortlistAdds || 0) >
    0;

  if (!hasActivity) {
    return (
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-6 shadow-[0_22px_50px_-34px_rgba(15,31,28,0.5)]">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Guest guidance journey</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Mood filters, Help Me Choose, Concierge questions, and table picks will appear here as
          guests use the interactive menu.
        </p>
      </section>
    );
  }

  const cards = [
    {
      label: 'Mood filters',
      value: report.preferenceSelected || 0,
      hint: 'Craving pills tapped',
      icon: Sparkles,
    },
    {
      label: 'Help Me Choose',
      value: report.helpMeChooseCompleted || 0,
      hint:
        report.guidanceCompletionRate != null
          ? `${report.guidanceCompletionRate}% finish rate`
          : `${report.helpMeChooseStarted || 0} started`,
      icon: HelpCircle,
    },
    {
      label: 'Concierge',
      value: report.assistantQuestions || 0,
      hint: `${report.assistantOpened || 0} opens`,
      icon: MessageCircle,
    },
    {
      label: 'Table picks',
      value: report.shortlistAdds || 0,
      hint: `${report.shortlistViews || 0} shortlist views`,
      icon: UtensilsCrossed,
    },
  ];

  return (
    <section className="rounded-[1.5rem] border border-[var(--line)] bg-white/90 p-6 shadow-[0_22px_50px_-34px_rgba(15,31,28,0.5)]">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[var(--teal)]/10 p-2.5 text-[var(--teal)]">
          <Compass size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">Guest guidance journey</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            How guests explore with mood, guided quiz, Concierge, and table picks — useful for
            staffing and tonight&apos;s specials.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
            >
              <div className="flex items-center gap-2 text-[var(--teal)]">
                <Icon size={14} />
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {card.label}
                </p>
              </div>
              <p className="mt-1 text-xl font-semibold text-[var(--ink)]">
                {formatNumber(card.value)}
              </p>
              <p className="text-xs text-[var(--muted)]">{card.hint}</p>
            </div>
          );
        })}
      </div>

      {report.topMoods?.length ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Top cravings tonight
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {report.topMoods.map((row) => (
              <li
                key={row.mood}
                className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
              >
                {MOOD_LABELS[row.mood] || row.mood}
                <span className="ml-1.5 text-[var(--muted)]">{formatNumber(row.count)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.recentQuestions?.length ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Recent Concierge questions
          </p>
          <ul className="mt-2 space-y-1.5">
            {report.recentQuestions.map((q, index) => (
              <li key={`${q}-${index}`} className="text-sm text-[var(--ink-soft,#5c564c)]">
                “{q}”
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
