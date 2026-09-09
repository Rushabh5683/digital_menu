import React from 'react';
import { Sparkles, Flame, Leaf, Feather, Award, Heart, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WelcomeSectionProps {
  activeMood: string | null;
  onSelectMood: (mood: string | null) => void;
  onOpenHelpMeChoose: () => void;
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({
  activeMood,
  onSelectMood,
  onOpenHelpMeChoose,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const moodOptions = [
    { id: 'light', label: 'Something light', icon: Feather },
    { id: 'filling', label: 'Something filling', icon: Heart },
    { id: 'spicy', label: 'Spicy', icon: Flame },
    { id: 'vegetarian', label: 'Vegetarian', icon: Leaf },
    { id: 'chef', label: "Chef's recommendations", icon: Award },
    { id: 'popular', label: 'Popular tonight', icon: Sparkles },
  ];

  return (
    <section className="pt-6 sm:pt-9 pb-3 border-b border-stone-200/60 max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs font-medium tracking-[0.2em] text-[#9A7B4F] uppercase mb-1.5">
            <span>{getGreeting()}</span>
            <span className="text-stone-300">·</span>
            <span>Table 14</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-serif text-stone-900 font-normal leading-[1.2]">
            What's your craving tonight?
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 font-normal mt-1 max-w-lg leading-relaxed">
            Explore heritage woodfire grills, slow-braised curries, and artisanal dum biryanis.
          </p>
        </div>

        {/* Guided Concierge Fast Trigger */}
        <button
          id="welcome-help-choose-btn"
          onClick={onOpenHelpMeChoose}
          className="self-start md:self-auto inline-flex items-center space-x-2 px-4 py-2.5 rounded-full bg-[#9A7B4F] hover:bg-[#866940] text-white text-xs sm:text-sm font-medium tracking-wide transition-all shadow-xs hover:shadow-sm active:scale-[0.98] cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-white/95" />
          <span>Help Me Choose</span>
        </button>
      </div>

      {/* Quick Mood Pills with tactile scroll */}
      <div className="mt-5 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {moodOptions.map((mood) => {
          const Icon = mood.icon;
          const isSelected = activeMood === mood.id;

          return (
            <button
              key={mood.id}
              id={`mood-btn-${mood.id}`}
              onClick={() => onSelectMood(isSelected ? null : mood.id)}
              className={`flex-shrink-0 inline-flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-medium tracking-wide border transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-[0.97] ${
                isSelected
                  ? 'bg-stone-950 text-[#FAF8F5] border-stone-950 shadow-xs'
                  : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200/90 shadow-2xs'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#E0CDA9]' : 'text-[#9A7B4F]'}`} />
              <span>{mood.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Mood Feedback Banner */}
      <AnimatePresence>
        {activeMood && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-3.5 inline-flex items-center space-x-3 px-3.5 py-1.5 bg-[#FAF6F0] border border-[#E8DFD3] rounded-full text-xs text-stone-800"
          >
            <span className="font-serif italic text-sm text-[#9A7B4F]">Active filter:</span>
            <span className="font-medium text-stone-900">
              {activeMood === 'light' ? 'Lighter starters & crudos' : activeMood === 'filling' ? 'Rich curries & dum biryanis' : activeMood === 'spicy' ? 'Warm, spiced specialties' : activeMood === 'vegetarian' ? 'Plant-forward & artisanal paneer' : activeMood === 'chef' ? "Executive Chef's highlights" : 'Celebrated guest favourites'}
            </span>
            <button
              onClick={() => onSelectMood(null)}
              className="p-1 hover:text-stone-950 text-stone-400 rounded-full hover:bg-stone-200/60 transition-colors cursor-pointer"
              title="Clear mood filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

