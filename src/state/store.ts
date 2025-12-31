import type { Node, NodePx, Thread, Phrase, ThreadPalettes } from '../types';

// Constants (not part of reactive state)
export const DOT_SIZE = 14;
export const DOT_RADIUS = DOT_SIZE / 2;

export const THREAD_PALETTES: ThreadPalettes = {
  music: ['#ff7a9e', '#ff9cc0', '#ffd3e1'],
  movement: ['#4fd1c5', '#7de8dd', '#b1fff4'],
  questions: ['#f6c56c', '#ffd28c', '#ffe7b8'],
};

// State shape
export interface State {
  // Content data
  phrases: Phrase[];
  nodes: Node[];
  threads: Thread[];

  // UI state
  isContainerMode: boolean;
  activeNodeId: string | null;
  pendingNodeId: string | null;

  // Animation locks
  isAnimatingContainer: boolean;
  isNodeSwitching: boolean;

  // DOM cache
  dotElementsById: Map<string, HTMLElement>;
  lastNodesPx: NodePx[];

  // Runtime caches
  curiosityCentralById: Map<string, string>;
  activeParticleStreams: Map<string, unknown>;

  // Callbacks
  refreshCuriosityLines: (() => void) | null;
}

// Initial state
const initialState: State = {
  phrases: [],
  nodes: [],
  threads: [],

  isContainerMode: false,
  activeNodeId: null,
  pendingNodeId: null,

  isAnimatingContainer: false,
  isNodeSwitching: false,

  dotElementsById: new Map(),
  lastNodesPx: [],

  curiosityCentralById: new Map(),
  activeParticleStreams: new Map(),

  refreshCuriosityLines: null,
};

// Current state (private)
let state: State = { ...initialState };

// Subscriber type
type Subscriber<K extends keyof State> = (value: State[K], prev: State[K]) => void;
type AnySubscriber = (state: State) => void;

// Subscription registry
const subscribers = new Map<keyof State, Set<Subscriber<keyof State>>>();
const anySubscribers = new Set<AnySubscriber>();

// Get current state (readonly snapshot)
export function getState(): Readonly<State> {
  return state;
}

// Get specific value
export function get<K extends keyof State>(key: K): State[K] {
  return state[key];
}

// Set specific value and notify subscribers
export function set<K extends keyof State>(key: K, value: State[K]): void {
  const prev = state[key];
  if (prev === value) return;

  state = { ...state, [key]: value };

  // Notify key-specific subscribers
  const keySubscribers = subscribers.get(key);
  if (keySubscribers) {
    keySubscribers.forEach((fn) => fn(value, prev));
  }

  // Notify any-change subscribers
  anySubscribers.forEach((fn) => fn(state));
}

// Batch update multiple values
export function update(partial: Partial<State>): void {
  const changedKeys: (keyof State)[] = [];
  const prevState = { ...state };

  for (const key of Object.keys(partial) as (keyof State)[]) {
    if (state[key] !== partial[key]) {
      changedKeys.push(key);
    }
  }

  if (changedKeys.length === 0) return;

  state = { ...state, ...partial };

  // Notify subscribers for changed keys
  for (const key of changedKeys) {
    const keySubscribers = subscribers.get(key);
    if (keySubscribers) {
      keySubscribers.forEach((fn) => fn(state[key], prevState[key]));
    }
  }

  // Notify any-change subscribers once
  anySubscribers.forEach((fn) => fn(state));
}

// Subscribe to specific key changes
export function subscribe<K extends keyof State>(
  key: K,
  fn: Subscriber<K>
): () => void {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key)!.add(fn as Subscriber<keyof State>);

  // Return unsubscribe function
  return () => {
    subscribers.get(key)?.delete(fn as Subscriber<keyof State>);
  };
}

// Subscribe to any state change
export function subscribeAll(fn: AnySubscriber): () => void {
  anySubscribers.add(fn);
  return () => anySubscribers.delete(fn);
}

// Reset state to initial values
export function reset(): void {
  state = {
    ...initialState,
    dotElementsById: new Map(),
    lastNodesPx: [],
    curiosityCentralById: new Map(),
    activeParticleStreams: new Map(),
  };
  anySubscribers.forEach((fn) => fn(state));
}
