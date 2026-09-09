import React, { useState } from 'react';
import { Dish } from '../types';
import { getHelpMeChooseRecommendations } from '../services/searchAndRecommendation';
import { X, ArrowRight, RotateCcw, ChevronRight, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { formatPrice } from '../utils/formatters';

interface HelpMeChooseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDish: (dish: Dish) => void;
  onCompleted?: () => void;
}

export const HelpMeChooseModal: React.FC<HelpMeChooseModalProps> = ({
  isOpen,
  onClose,
  onSelectDish,
  onCompleted,
}) => {
  const [step, setStep] = useState<number>(1);
  const [answers, setAnswers] = useState({
    mood: 'light',
    spice: 'mild',
    protein: 'anything',
    hunger: 'normal',
  });
  const [recommendations, setRecommendations] = useState<{ dish: Dish; explanation: string }[] | null>(null);

  if (!isOpen) return null;

  const handleFinish = (finalAnswers = answers) => {
    const recs = getHelpMeChooseRecommendations(finalAnswers);
    setRecommendations(recs);
    setStep(5);
    if (onCompleted) onCompleted();
  };

  const resetAll = () => {
    setStep(1);
    setAnswers({
      mood: 'light',
      spice: 'mild',
      protein: 'anything',
      hunger: 'normal',
    });
    setRecommendations(null);
  };

  const stepsData = [
    {
      number: 1,
      title: 'What style of dining are you seeking tonight?',
      subtitle: 'Select the primary character of your meal.',
      key: 'mood',
      options: [
        { id: 'light', label: 'Something Light & Clean', desc: 'Charcoal grills, delicate starters & light broths' },
        { id: 'filling', label: 'Rich & Substantial', desc: 'Slow-cooked braises, handi biryanis & rich curries' },
        { id: 'comforting', label: 'Comforting & Creamy', desc: 'Velvety makhani sauces, black dal & warm flatbreads' },
        { id: 'new', label: 'Something Adventurous', desc: 'Heritage wild morels, duck breast & rare spices' },
        { id: 'popular', label: 'Celebrated Classics', desc: 'Our most ordered and beloved guest favourites' },
        { id: 'chef', label: "Executive Chef's Selection", desc: 'Culinary highlights of tonight’s service' },
      ],
    },
    {
      number: 2,
      title: 'How do you prefer your spice warmth?',
      subtitle: 'We calibrate our chilies to balance aroma with heat.',
      key: 'spice',
      options: [
        { id: 'none', label: 'Zero Spice / Very Delicate', desc: 'Floral saffron, cardamom, cream & zero chili' },
        { id: 'mild', label: 'Mild & Aromatic', desc: 'Gentle warming spices without tongue burn' },
        { id: 'medium', label: 'Medium Spice Kick', desc: 'Traditional Kashmiri chili & roasted black cumin' },
        { id: 'hot', label: 'Bold & Fiery', desc: 'Authentic Chettinad stone-flower & tellicherry pepper' },
      ],
    },
    {
      number: 3,
      title: 'What main ingredient profile do you desire?',
      subtitle: 'All meats are halal-certified and produce is organic.',
      key: 'protein',
      options: [
        { id: 'anything', label: 'Anything / Open to All', desc: 'Show me the best dishes across all categories' },
        { id: 'vegetarian', label: 'Vegetarian & Plant-Based', desc: 'Artisanal paneer, wild morels, lentils & jackfruit' },
        { id: 'chicken', label: 'Corn-Fed Chicken', desc: 'Free-range tandoor chicken & butter chicken curries' },
        { id: 'lamb', label: 'British Dorset Lamb', desc: 'Himalayan lamb chops, slow shanks & dum biryani' },
        { id: 'seafood', label: 'Coastal Seafood', desc: 'King scallops, tiger prawns & coastal fish' },
      ],
    },
    {
      number: 4,
      title: 'How hungry are you feeling right now?',
      subtitle: 'To guide optimal portion sizes and course pairing.',
      key: 'hunger',
      options: [
        { id: 'little', label: 'Just a Little / Light Bite', desc: 'A starter with a botanical beverage' },
        { id: 'normal', label: 'Standard Appetite', desc: 'A starter, bread, and a slow-cooked main' },
        { id: 'hungry', label: 'Very Hungry / Feast', desc: 'Platter, royal dum biryani & signature sides' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/65 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 30 }}
        className="relative w-full max-w-xl bg-[#FAF8F5] rounded-t-3xl sm:rounded-2xl border border-stone-200/90 shadow-2xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200/70 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#9A7B4F]/15 flex items-center justify-center text-[#9A7B4F]">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-medium text-stone-900 leading-tight">
                Menu Concierge Guidance
              </h3>
              <span className="text-[11px] text-stone-500 font-normal">
                {step <= 4 ? `Step ${step} of 4` : 'Tailored Recommendations'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200/80 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEPS 1 - 4 */}
        {step <= 4 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-serif text-xl text-stone-900 font-normal">
                {stepsData[step - 1].title}
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                {stepsData[step - 1].subtitle}
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {stepsData[step - 1].options.map((opt) => {
                const currentKey = stepsData[step - 1].key as keyof typeof answers;
                const isSelected = answers[currentKey] === opt.id;

                return (
                  <button
                    key={opt.id}
                    id={`help-option-${opt.id}`}
                    onClick={() => {
                      const newAnswers = { ...answers, [currentKey]: opt.id };
                      setAnswers(newAnswers);
                      if (step < 4) {
                        setStep(step + 1);
                      } else {
                        handleFinish(newAnswers);
                      }
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                      isSelected
                        ? 'bg-white border-[#9A7B4F] shadow-2xs ring-1 ring-[#9A7B4F]/40'
                        : 'bg-white/80 hover:bg-white border-stone-200/80 text-stone-800 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      <span className="font-serif font-medium text-stone-900 text-sm block">
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-stone-500 font-normal block mt-0.5 leading-relaxed">
                        {opt.desc}
                      </span>
                    </div>
                    <div className="pl-3 pt-1 text-stone-300">
                      <ChevronRight className="w-4 h-4 text-[#9A7B4F]" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Back button if step > 1 */}
            {step > 1 && (
              <div className="pt-2 flex justify-start">
                <button
                  onClick={() => setStep(step - 1)}
                  className="text-xs font-medium text-stone-500 hover:text-stone-900 underline cursor-pointer p-1"
                >
                  ← Back to previous question
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: RECOMMENDATIONS VIEW */}
        {step === 5 && recommendations && (
          <div className="space-y-5">
            <div>
              <span className="text-[11px] font-medium tracking-[0.2em] text-[#9A7B4F] uppercase block mb-1">
                Handcrafted Fit
              </span>
              <h4 className="font-serif text-2xl text-stone-900 font-normal leading-tight">
                Three dishes worth considering tonight
              </h4>
              <p className="text-xs text-stone-600 mt-1">
                Curated based on your selection for {answers.mood} dining with {answers.spice} warmth.
              </p>
            </div>

            <div className="space-y-3">
              {recommendations.map(({ dish, explanation }, idx) => (
                <div
                  key={dish.id}
                  id={`help-rec-${idx}`}
                  onClick={() => {
                    onClose();
                    onSelectDish(dish);
                  }}
                  className="p-4 bg-white rounded-2xl border border-stone-200/90 hover:border-[#9A7B4F] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-start space-x-3.5 group"
                >
                  <img
                    src={dish.image}
                    alt={dish.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <h5 className="font-serif font-medium text-stone-900 text-base group-hover:text-[#9A7B4F] transition-colors truncate">
                        {dish.name}
                      </h5>
                      <span className="font-serif font-semibold text-stone-900 text-sm whitespace-nowrap">
                        {formatPrice(dish.price)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#866940] italic mt-1 leading-snug">
                      "{explanation}"
                    </p>
                    <div className="mt-2.5 text-[10px] uppercase tracking-wider font-semibold text-[#9A7B4F] flex items-center space-x-1">
                      <span>View dish details</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={resetAll}
                className="inline-flex items-center space-x-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 cursor-pointer p-1.5 rounded-lg hover:bg-stone-100"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start over</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-stone-950 text-stone-50 text-xs font-medium tracking-wider uppercase hover:bg-stone-800 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                Return to Menu
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

