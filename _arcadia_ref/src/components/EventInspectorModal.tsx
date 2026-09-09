import React, { useEffect, useState } from 'react';
import { BehaviouralEvent, SessionJourneyStep } from '../types';
import { tracker } from '../services/eventTracker';
import { X, Activity, Radio, ArrowRight, ShieldCheck, Database, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface EventInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EventInspectorModal: React.FC<EventInspectorModalProps> = ({ isOpen, onClose }) => {
  const [events, setEvents] = useState<BehaviouralEvent[]>([]);
  const [journey, setJourney] = useState<SessionJourneyStep[]>([]);
  const [summary, setSummary] = useState(tracker.getSignalsSummary());
  const [activeTab, setActiveTab] = useState<'journey' | 'raw_events' | 'metrics'>('journey');

  useEffect(() => {
    const unsubscribe = tracker.subscribe((evts) => {
      setEvents(evts);
      setJourney(tracker.getJourney());
      setSummary(tracker.getSignalsSummary());
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const stageBadgeColor = (stage: 'FIND' | 'UNDERSTAND' | 'DECIDE' | 'RECOVER') => {
    switch (stage) {
      case 'FIND':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'UNDERSTAND':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'DECIDE':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'RECOVER':
        return 'bg-purple-50 text-purple-800 border-purple-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-3xl bg-stone-900 text-stone-100 rounded-sm border border-stone-800 shadow-2xl p-5 sm:p-7 max-h-[90vh] flex flex-col justify-between font-mono"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-sans font-semibold text-stone-100 text-base">
                  Hospitality Intelligence & Signals Stream
                </h3>
                <span className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  <span>LIVE</span>
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                Anonymous Session: <span className="text-[#E0CDA9]">{tracker.getSessionId()}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 pb-3 border-b border-stone-800 text-xs font-sans">
          <button
            onClick={() => setActiveTab('journey')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'journey'
                ? 'bg-stone-800 text-stone-100 font-semibold border border-stone-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Guest Journey Loop ({journey.length})
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-stone-800 text-stone-100 font-semibold border border-stone-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Signals & Intelligence Summary
          </button>
          <button
            onClick={() => setActiveTab('raw_events')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'raw_events'
                ? 'bg-stone-800 text-stone-100 font-semibold border border-stone-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Raw Event Telemetry ({events.length})
          </button>
        </div>

        {/* TAB 1: 4-STAGE JOURNEY LOOP (FIND → UNDERSTAND → DECIDE → RECOVER) */}
        {activeTab === 'journey' && (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 my-3 pr-1 min-h-[300px] max-h-[460px]">
            {journey.map((step, idx) => (
              <div
                key={step.id}
                className="p-3 bg-stone-950/70 rounded border border-stone-800 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-sans font-bold border ${stageBadgeColor(
                        step.stage
                      )}`}
                    >
                      {step.stage}
                    </span>
                    <span className="text-stone-200 font-mono font-medium">
                      {step.label}
                    </span>
                  </div>
                  {step.details && (
                    <div className="text-[11px] text-stone-400 font-sans pl-1">
                      → {step.details}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-stone-500 whitespace-nowrap">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: INTELLIGENCE SUMMARY & DERIVED METRICS */}
        {activeTab === 'metrics' && (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 my-3 pr-1 min-h-[300px] max-h-[460px] font-sans">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded bg-stone-950 border border-stone-800">
                <span className="text-stone-400 text-[11px] block">Total Signals Logged</span>
                <span className="text-xl font-bold text-stone-100 mt-1 block">
                  {summary.totalEvents}
                </span>
              </div>
              <div className="p-3 rounded bg-stone-950 border border-stone-800">
                <span className="text-stone-400 text-[11px] block">Dishes Explored</span>
                <span className="text-xl font-bold text-stone-100 mt-1 block">
                  {summary.dishesExplored}
                </span>
              </div>
              <div className="p-3 rounded bg-stone-950 border border-stone-800">
                <span className="text-stone-400 text-[11px] block">Side-by-Side Compares</span>
                <span className="text-xl font-bold text-[#E0CDA9] mt-1 block">
                  {summary.comparisonsMade}
                </span>
              </div>
              <div className="p-3 rounded bg-stone-950 border border-stone-800">
                <span className="text-stone-400 text-[11px] block">Zero Result Recoveries</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block">
                  {summary.recoveriesAccepted}
                </span>
              </div>
            </div>

            <div className="p-4 rounded bg-stone-950 border border-stone-800 space-y-3 text-xs text-stone-300">
              <h4 className="font-semibold text-stone-100 text-sm">
                How These Signals Feed Restaurant Intelligence:
              </h4>
              <ul className="space-y-2 list-disc pl-4 text-stone-400 leading-relaxed">
                <li>
                  <strong className="text-stone-200">Zero-Result Searches:</strong> Unveils guest cravings not on the menu (e.g. guests searching for cocktails or vegan flatbreads) to guide menu R&D.
                </li>
                <li>
                  <strong className="text-stone-200">Decision Loops & Comparison:</strong> Pinpoints dishes causing friction before selection, showing which taste profiles require clearer menu copywriting.
                </li>
                <li>
                  <strong className="text-stone-200">Ingredient Taps:</strong> Highlights guest allergen concerns and ingredient curiosity (e.g. Kashmiri morels vs truffles) in real time.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: RAW JSON TELEMETRY */}
        {activeTab === 'raw_events' && (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 my-3 p-3 bg-stone-950 rounded border border-stone-800 min-h-[300px] max-h-[460px] text-[11px] text-stone-300">
            <pre className="whitespace-pre-wrap font-mono">
              {JSON.stringify(events.slice(-15), null, 2)}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs font-sans text-stone-400">
          <span>Privacy Verified: Zero PII Collected</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </motion.div>
    </div>
  );
};
