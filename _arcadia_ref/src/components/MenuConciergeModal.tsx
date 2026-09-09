import React, { useState } from 'react';
import { Dish } from '../types';
import { answerConciergeQuery } from '../services/searchAndRecommendation';
import { X, Sparkles, Send, ArrowRight, MessageSquare, Utensils } from 'lucide-react';
import { motion } from 'motion/react';
import { formatPrice } from '../utils/formatters';

interface MenuConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDish: (dish: Dish) => void;
  onQuestionAsked?: (q: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'concierge';
  text: string;
  dishes?: Dish[];
}

export const MenuConciergeModal: React.FC<MenuConciergeModalProps> = ({
  isOpen,
  onClose,
  onSelectDish,
  onQuestionAsked,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'concierge',
      text: 'Good evening. I am your Arcadia Menu Concierge. I can guide you through our charcoal grills, slow earthen handi curries, dietary selections, and wine pairings. How may I assist your choices tonight?',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');

  if (!isOpen) return null;

  const quickQuestions = [
    'What is most popular tonight?',
    'What is mild with no sharp spice?',
    'Best vegetarian choices?',
    'What dishes are made for sharing?',
    'Which dishes are dairy-free?',
  ];

  const handleSend = (textToSend: string) => {
    const q = textToSend.trim();
    if (!q) return;

    if (onQuestionAsked) onQuestionAsked(q);

    const userMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: q,
    };

    const result = answerConciergeQuery(q);

    const conciergeMsg: ChatMessage = {
      id: 'concierge_' + Date.now(),
      sender: 'concierge',
      text: result.answer,
      dishes: result.recommendedDishes,
    };

    setMessages((prev) => [...prev, userMsg, conciergeMsg]);
    setInputQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/65 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 30 }}
        className="relative w-full max-w-lg bg-[#FAF8F5] rounded-t-3xl sm:rounded-2xl border border-stone-200/90 shadow-2xl p-5 sm:p-6 max-h-[90vh] flex flex-col justify-between"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/70 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#9A7B4F]/15 flex items-center justify-center text-[#9A7B4F]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-stone-900 leading-tight">
                Arcadia Menu Concierge
              </h3>
              <span className="text-[11px] text-stone-500 font-normal">
                Grounded in our kitchen's recipes & sourcing
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200/80 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            aria-label="Close concierge"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 pr-1 min-h-[260px] max-h-[420px] mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-stone-950 text-stone-50 rounded-br-xs'
                    : 'bg-white border border-stone-200/90 text-stone-800 shadow-2xs rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>

              {/* Recommended dishes attachments */}
              {msg.dishes && msg.dishes.length > 0 && (
                <div className="mt-2.5 space-y-2 w-full max-w-[92%]">
                  {msg.dishes.map((dish) => (
                    <div
                      key={dish.id}
                      onClick={() => {
                        onClose();
                        onSelectDish(dish);
                      }}
                      className="p-3 bg-white rounded-xl border border-stone-200/80 hover:border-[#9A7B4F] flex items-center space-x-3 transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                    >
                      <img
                        src={dish.image}
                        alt={dish.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <span className="font-serif font-medium text-stone-900 text-xs sm:text-sm group-hover:text-[#9A7B4F] transition-colors truncate">
                            {dish.name}
                          </span>
                          <span className="font-serif font-semibold text-stone-900 text-xs">
                            {formatPrice(dish.price)}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#866940] truncate block mt-0.5">
                          {dish.tasteProfile.join(' · ')} · {dish.spiceLabel}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#9A7B4F] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Suggested Quick Prompts */}
        <div className="pb-3 overflow-x-auto no-scrollbar flex items-center space-x-1.5">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="flex-shrink-0 px-3 py-1 text-[11px] rounded-full bg-stone-100 hover:bg-[#FAF6F0] hover:border-[#9A7B4F]/40 text-stone-700 hover:text-stone-950 border border-transparent transition-colors whitespace-nowrap cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputQuery);
          }}
          className="relative flex items-center bg-white rounded-2xl border border-stone-200 shadow-xs focus-within:border-[#9A7B4F] focus-within:ring-2 focus-within:ring-[#9A7B4F]/20 transition-all"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about flavours, pairings, ingredients..."
            className="w-full py-2.5 pl-4 pr-12 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 bg-transparent outline-none"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim()}
            className="absolute right-1.5 p-2 rounded-xl bg-stone-950 disabled:bg-stone-200 text-white transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
            aria-label="Send query"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
