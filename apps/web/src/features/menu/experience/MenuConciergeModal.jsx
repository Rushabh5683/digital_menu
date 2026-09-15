import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Sparkles, RotateCcw, ArrowRight, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPrice, dishImage } from './lib/formatters.js';
import { answerConciergeQuery } from './lib/recommendations.js';
import {
  analyzeMenuForConcierge,
  buildConciergeGreeting,
  buildConciergeQuickPrompts,
  buildConciergeSteps,
  getConciergeRecommendations,
  summarizeAnswers,
} from './lib/conciergeFlow.js';

function MessageBubble({ msg, currency, onSelectDish, onClose }) {
  return (
    <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[92%] rounded-2xl p-3.5 text-xs leading-relaxed sm:text-[13px] ${
          msg.sender === 'user'
            ? 'rounded-br-sm bg-stone-950 text-stone-50'
            : 'rounded-bl-sm border border-stone-200/90 bg-white text-stone-800 shadow-sm'
        }`}
      >
        {msg.text}
        {msg.subtitle ? (
          <p className="mt-1.5 text-[11px] text-stone-500">{msg.subtitle}</p>
        ) : null}
      </div>

      {msg.options?.length ? (
        <div className="mt-2.5 w-full max-w-[95%] space-y-2">
          {msg.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={msg.locked}
              onClick={() => msg.onSelectOption?.(opt)}
              className={`flex w-full items-start justify-between gap-2 rounded-2xl border px-3.5 py-3 text-left transition ${
                msg.selectedId === opt.id
                  ? 'border-[#9A7B4F] bg-[#FAF6F0] ring-1 ring-[#9A7B4F]/35'
                  : 'border-stone-200/90 bg-white hover:border-[#9A7B4F]/50'
              } ${msg.locked ? 'opacity-70' : 'active:scale-[0.99]'}`}
            >
              <div className="min-w-0">
                <p className="font-serif text-sm font-medium text-stone-900">{opt.label}</p>
                {opt.desc ? (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">{opt.desc}</p>
                ) : null}
                {opt.meta?.type === 'category' ? (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#9A7B4F]">
                    Category
                  </p>
                ) : null}
                {opt.meta?.type === 'tag' && opt.meta?.tag ? (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#9A7B4F]">
                    Admin tag
                  </p>
                ) : null}
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#9A7B4F]" />
            </button>
          ))}
        </div>
      ) : null}

      {msg.dishes?.length ? (
        <div className="mt-2.5 w-full max-w-[95%] space-y-2">
          {msg.dishes.map((item) => {
            const dish = item.dish || item;
            const explanation = item.explanation;
            return (
              <div
                key={dish.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onClose?.();
                  onSelectDish?.(dish);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onClose?.();
                    onSelectDish?.(dish);
                  }
                }}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200/80 bg-white p-3 shadow-sm transition hover:border-[#9A7B4F]"
              >
                {dishImage(dish) ? (
                  <img
                    src={dishImage(dish)}
                    alt={dish.name}
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-[#E8DFD3] to-[#C5A880]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-serif text-sm font-medium text-stone-900 group-hover:text-[#9A7B4F]">
                      {dish.name}
                    </span>
                    <span className="shrink-0 font-serif text-xs font-semibold text-stone-900">
                      {formatPrice(dish.price, currency)}
                    </span>
                  </div>
                  {dish.categoryName ? (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                      {dish.categoryName}
                    </p>
                  ) : null}
                  {(dish.dietaryTags || []).length ? (
                    <p className="mt-0.5 truncate text-[10px] text-[#866940]">
                      {(dish.dietaryTags || []).slice(0, 3).join(' · ')}
                    </p>
                  ) : null}
                  {explanation ? (
                    <p className="mt-1 text-[11px] italic text-stone-500">&quot;{explanation}&quot;</p>
                  ) : null}
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#9A7B4F]" />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function MenuConciergeModal({
  isOpen,
  onClose,
  onSelectDish,
  onQuestionAsked,
  dishes = [],
  restaurantName = 'our restaurant',
  currency = 'INR',
}) {
  const analysis = useMemo(
    () => analyzeMenuForConcierge(dishes, { restaurantName }),
    [dishes, restaurantName],
  );
  const steps = useMemo(() => buildConciergeSteps(analysis), [analysis]);
  const quickPrompts = useMemo(() => buildConciergeQuickPrompts(analysis), [analysis]);

  const [messages, setMessages] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const listRef = useRef(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }

  function startFlow() {
    const greeting = buildConciergeGreeting(analysis);
    const first = steps[0];
    const initial = [
      {
        id: 'greet',
        sender: 'concierge',
        text: greeting.text,
      },
    ];

    if (first && first.kind !== 'final') {
      initial.push({
        id: `step-${first.id}`,
        sender: 'concierge',
        text: first.question,
        subtitle: `Question 1 of ${steps.length} · ${first.subtitle || ''}`,
        options: first.options,
        selectedId: null,
        locked: false,
        stepId: first.id,
        stepKey: first.key,
      });
    } else if (first?.kind === 'final') {
      initial.push({
        id: 'empty',
        sender: 'concierge',
        text: first.question,
        subtitle: first.subtitle,
      });
    }

    setMessages(initial);
    setStepIndex(0);
    setAnswers({});
    setFinished(false);
    setInputQuery('');
    scrollToBottom();
  }

  useEffect(() => {
    if (!isOpen) return;
    startFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, restaurantName, steps]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen) return null;

  function lockCurrentOptions(selectedId) {
    setMessages((prev) =>
      prev.map((m) =>
        m.options && !m.locked ? { ...m, locked: true, selectedId } : m,
      ),
    );
  }

  function finishWithAnswers(finalAnswers) {
    const recs = getConciergeRecommendations(finalAnswers, dishes, analysis);
    const summary = summarizeAnswers(finalAnswers, analysis);
    setFinished(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `recs-${Date.now()}`,
        sender: 'concierge',
        text:
          recs.length > 0
            ? `Based on your answers${summary.length ? ` (${summary.join(' · ')})` : ''}, here are dishes from ${restaurantName} that match the category and tags you chose.`
            : `I couldn’t find a close tag match. Here are available dishes from ${restaurantName}.`,
        subtitle: 'Final recommendations from this restaurant’s menu',
        dishes: recs,
      },
    ]);
    onQuestionAsked?.('concierge_flow_completed', { answers: finalAnswers, count: recs.length });
  }

  function handleSelectOption(opt, step) {
    if (finished) return;

    onQuestionAsked?.(opt.label, { step: step.id, key: step.key, optionId: opt.id });
    lockCurrentOptions(opt.id);

    const nextAnswers = { ...answers, [step.key]: opt.id };
    setAnswers(nextAnswers);

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: opt.label,
      },
    ]);

    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) {
      finishWithAnswers(nextAnswers);
      return;
    }

    const nextStep = steps[nextIndex];
    setStepIndex(nextIndex);
    setMessages((prev) => [
      ...prev,
      {
        id: `step-${nextStep.id}-${Date.now()}`,
        sender: 'concierge',
        text: nextStep.question,
        subtitle: `Question ${nextIndex + 1} of ${steps.length} · ${nextStep.subtitle || ''}`,
        options: nextStep.options,
        selectedId: null,
        locked: false,
        stepId: nextStep.id,
        stepKey: nextStep.key,
      },
    ]);
  }

  // Attach handlers to latest unlocked question message
  const renderedMessages = messages.map((msg) => {
    if (!msg.options || msg.locked) return msg;
    const step = steps.find((s) => s.id === msg.stepId) || steps[stepIndex];
    return {
      ...msg,
      onSelectOption: (opt) => handleSelectOption(opt, step),
    };
  });

  function handleFreeform(textToSend) {
    const q = textToSend.trim();
    if (!q) return;
    onQuestionAsked?.(q);

    // If still in guided flow, treat free text as optional side answer but keep guiding
    const result = answerConciergeQuery(q, dishes, restaurantName);
    setMessages((prev) => [
      ...prev,
      { id: `user-free-${Date.now()}`, sender: 'user', text: q },
      {
        id: `free-${Date.now()}`,
        sender: 'concierge',
        text: finished
          ? result.answer
          : `${result.answer}\n\nYou can keep tapping the options above to finish the guided questions.`,
        dishes: (result.dishes || result.recommendedDishes || []).map((d) => ({ dish: d })),
      },
    ]);
    setInputQuery('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[var(--g-ink)]/15 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col justify-between rounded-t-3xl border border-stone-200/90 bg-[#FAF8F5] p-5 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between border-b border-stone-200/70 pb-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9A7B4F]/15 text-[#9A7B4F]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-serif text-lg font-medium leading-tight text-stone-900">
                {restaurantName} Menu Concierge
              </h3>
              <span className="text-[11px] font-normal text-stone-500">
                {finished
                  ? 'Recommendations ready'
                  : `Guided by categories & admin tags · Q${Math.min(stepIndex + 1, steps.length || 1)}/${steps.length || 1}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startFlow}
              className="rounded-full p-2 text-stone-500 hover:bg-stone-200/80 hover:text-stone-900"
              aria-label="Restart guidance"
              title="Start over"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-stone-500 hover:bg-stone-200/80 hover:text-stone-900"
              aria-label="Close concierge"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={listRef}
          className="mb-3 min-h-[280px] max-h-[48vh] flex-1 space-y-3.5 overflow-y-auto pr-1 no-scrollbar sm:max-h-[420px]"
        >
          {renderedMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              currency={currency}
              onSelectDish={onSelectDish}
              onClose={onClose}
            />
          ))}
        </div>

        {!finished && quickPrompts.length > 0 ? (
          <div className="mb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {quickPrompts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleFreeform(q)}
                className="shrink-0 whitespace-nowrap rounded-full border border-transparent bg-stone-100 px-3 py-1 text-[11px] text-stone-700 hover:border-[#9A7B4F]/40 hover:bg-[#FAF6F0]"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFreeform(inputQuery);
          }}
          className="relative flex items-center rounded-2xl border border-stone-200 bg-white shadow-sm focus-within:border-[#9A7B4F] focus-within:ring-2 focus-within:ring-[#9A7B4F]/20"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              finished
                ? 'Ask anything else about the menu…'
                : 'Or type a question while answering above…'
            }
            className="w-full bg-transparent py-2.5 pl-4 pr-12 text-xs text-stone-900 outline-none placeholder:text-stone-400 sm:text-sm"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim()}
            className="absolute right-1.5 rounded-xl bg-stone-950 p-2 text-white transition disabled:bg-stone-200"
            aria-label="Send query"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
