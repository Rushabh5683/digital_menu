import { BehaviouralEvent, EventName, SessionJourneyStep } from '../types';

// Generate a random anonymous session ID for this QR diner visit
const getOrCreateSessionId = (): string => {
  let sid = sessionStorage.getItem('arcadia_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    sessionStorage.setItem('arcadia_session_id', sid);
  }
  return sid;
};

class EventTracker {
  private events: BehaviouralEvent[] = [];
  private listeners: ((events: BehaviouralEvent[]) => void)[] = [];
  private sessionId: string;
  private restaurantId: string = 'arcadia_london';
  private sessionStartTime: number;

  constructor() {
    this.sessionId = getOrCreateSessionId();
    this.sessionStartTime = Date.now();

    // Auto-record initial entry
    this.track('MENU_OPENED', {
      context: {
        entryTime: new Date().toISOString(),
        referrer: 'QR_TABLE_14',
        viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      },
    });
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public track(
    eventName: EventName,
    payload: {
      dishId?: string;
      dishName?: string;
      categoryId?: string;
      searchQuery?: string;
      intent?: Record<string, any>;
      comparisonPair?: [string, string];
      context?: Record<string, any>;
      metadata?: Record<string, any>;
    } = {}
  ): BehaviouralEvent {
    const event: BehaviouralEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now(),
      eventName,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      restaurantId: this.restaurantId,
      ...payload,
    };

    this.events.push(event);

    // Keep session storage updated for dev inspector & persistence
    try {
      sessionStorage.setItem('arcadia_events_log', JSON.stringify(this.events.slice(-50)));
    } catch {
      // ignore
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener([...this.events]);
      } catch (e) {
        console.error('Error in event listener:', e);
      }
    });

    return event;
  }

  public getEvents(): BehaviouralEvent[] {
    return [...this.events];
  }

  public subscribe(listener: (events: BehaviouralEvent[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.events]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getJourney(): SessionJourneyStep[] {
    const steps: SessionJourneyStep[] = [];

    this.events.forEach((evt) => {
      let stage: 'FIND' | 'UNDERSTAND' | 'DECIDE' | 'RECOVER' = 'FIND';
      let label = evt.eventName.replace(/_/g, ' ');
      let details = '';

      switch (evt.eventName) {
        case 'MENU_OPENED':
        case 'CATEGORY_VIEWED':
        case 'SEARCH_PERFORMED':
        case 'FILTER_APPLIED':
        case 'PREFERENCE_SELECTED':
          stage = 'FIND';
          if (evt.searchQuery) details = `Searched: "${evt.searchQuery}"`;
          else if (evt.categoryId) details = `Category: ${evt.categoryId}`;
          else if (evt.intent) details = `Mood: ${JSON.stringify(evt.intent)}`;
          break;

        case 'DISH_VIEWED':
        case 'INGREDIENTS_OPENED':
        case 'INGREDIENT_TAPPED':
        case 'DIETARY_INFO_OPENED':
        case 'SPICE_INFO_OPENED':
        case 'DESCRIPTION_EXPANDED':
          stage = 'UNDERSTAND';
          details = evt.dishName || evt.dishId || '';
          break;

        case 'DISH_COMPARED':
        case 'COMPARISON_COMPLETED':
        case 'HELP_ME_CHOOSE_STARTED':
        case 'HELP_ME_CHOOSE_COMPLETED':
        case 'RECOMMENDATION_CLICKED':
        case 'SHORTLIST_ITEM_ADDED':
        case 'SHORTLIST_VIEWED':
          stage = 'DECIDE';
          if (evt.comparisonPair) details = `Compared: ${evt.comparisonPair.join(' vs ')}`;
          else if (evt.dishName) details = `Shortlisted: ${evt.dishName}`;
          break;

        case 'ZERO_RESULT_SEARCH':
        case 'SEARCH_RECOVERY_SHOWN':
        case 'SEARCH_RECOVERY_CLICKED':
        case 'UNAVAILABLE_DISH_VIEWED':
        case 'ALTERNATIVE_SHOWN':
        case 'ALTERNATIVE_CLICKED':
        case 'ASSISTANT_OPENED':
        case 'ASSISTANT_QUESTION_ASKED':
          stage = 'RECOVER';
          if (evt.searchQuery) details = `Recovered from: "${evt.searchQuery}"`;
          else if (evt.dishName) details = `Alternative for: ${evt.dishName}`;
          break;

        default:
          stage = 'FIND';
      }

      steps.push({
        id: evt.id,
        stage,
        event: evt.eventName,
        label,
        timestamp: evt.timestamp,
        details,
      });
    });

    return steps;
  }

  public getSignalsSummary() {
    const totalEvents = this.events.length;
    const searches = this.events.filter((e) => e.eventName === 'SEARCH_PERFORMED');
    const zeroResults = this.events.filter((e) => e.eventName === 'ZERO_RESULT_SEARCH');
    const recoveryClicks = this.events.filter((e) => e.eventName === 'SEARCH_RECOVERY_CLICKED' || e.eventName === 'ALTERNATIVE_CLICKED');
    const comparisons = this.events.filter((e) => e.eventName === 'DISH_COMPARED');
    const dishViews = this.events.filter((e) => e.eventName === 'DISH_VIEWED');
    const shortlistItems = this.events.filter((e) => e.eventName === 'SHORTLIST_ITEM_ADDED');
    const helpMeChoose = this.events.filter((e) => e.eventName === 'HELP_ME_CHOOSE_COMPLETED');
    const assistantQueries = this.events.filter((e) => e.eventName === 'ASSISTANT_QUESTION_ASKED');

    const durationSec = Math.max(1, Math.round((Date.now() - this.sessionStartTime) / 1000));

    return {
      totalEvents,
      durationSec,
      searchCount: searches.length,
      zeroResultRate: searches.length > 0 ? ((zeroResults.length / searches.length) * 100).toFixed(0) + '%' : '0%',
      recoveriesAccepted: recoveryClicks.length,
      dishesExplored: dishViews.length,
      comparisonsMade: comparisons.length,
      shortlistedCount: shortlistItems.length,
      assistedDecisions: helpMeChoose.length + assistantQueries.length,
    };
  }
}

export const tracker = new EventTracker();
