import React from 'react';
import { RestaurantConfig } from '../types';
import { Sparkles, UtensilsCrossed, Globe } from 'lucide-react';

interface RestaurantHeaderProps {
  config: RestaurantConfig;
  shortlistCount: number;
  onOpenShortlist: () => void;
  onOpenConcierge: () => void;
  onLanguageChange: (lang: string) => void;
}

export const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({
  config,
  shortlistCount,
  onOpenShortlist,
  onOpenConcierge,
  onLanguageChange,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full luxury-blur border-b border-stone-200/70 bg-[#FAF8F5]/90 backdrop-blur-md transition-all">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
        {/* Restaurant Identity & Context */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div>
            <div className="flex items-baseline space-x-2">
              <h1 className="text-xl sm:text-2xl font-serif tracking-[0.18em] font-medium text-stone-900 uppercase">
                {config.name}
              </h1>
              <span className="hidden sm:inline-block text-[11px] uppercase tracking-widest text-[#9A7B4F] font-medium">
                {config.tagline}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-stone-500 tracking-wide font-normal">
              <span>{config.location}</span>
              <span className="text-stone-300">·</span>
              <span className="text-stone-800 font-medium">{config.tableContext}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Language Selector */}
          <div className="relative group">
            <button
              id="header-lang-btn"
              aria-label="Change Language"
              className="h-9 px-3 rounded-full border border-stone-200/90 bg-white/80 hover:bg-stone-100/90 text-stone-700 text-xs font-medium tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-stone-400" />
              <span>{config.currentLanguage}</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block bg-white border border-stone-200/90 shadow-lg rounded-xl py-1.5 min-w-[110px] z-50 text-xs">
              {config.supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.code)}
                  className={`w-full text-left px-3.5 py-1.5 hover:bg-[#FAF6F0] transition-colors cursor-pointer ${
                    config.currentLanguage === lang.code ? 'font-semibold text-[#9A7B4F]' : 'text-stone-700'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Concierge Fast Entry */}
          <button
            id="header-concierge-btn"
            onClick={onOpenConcierge}
            className="h-9 px-3.5 rounded-full border border-[#9A7B4F]/35 bg-[#9A7B4F]/10 hover:bg-[#9A7B4F]/15 text-stone-900 text-xs font-medium flex items-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
            title="Ask Menu Concierge"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#9A7B4F]" />
            <span className="hidden md:inline">Concierge</span>
          </button>

          {/* Table Shortlist / My Picks */}
          <button
            id="header-shortlist-btn"
            onClick={onOpenShortlist}
            className="relative h-9 px-3.5 rounded-full bg-stone-950 hover:bg-stone-800 text-stone-50 text-xs font-medium flex items-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-xs"
            aria-label="View Table Shortlist"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#E0CDA9]" />
            <span className="hidden sm:inline">Picks</span>
            {shortlistCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-stone-900 bg-[#E0CDA9] rounded-full">
                {shortlistCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

