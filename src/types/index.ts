// Node types
export type NodeType = 'essay' | 'music' | 'movement' | 'curiosity' | 'durational' | 'bio';

export type ThreadType = 'music' | 'movement' | 'questions';

export interface Node {
  id: string;
  title: string;
  type: NodeType;
  subtype?: string;
  description?: string;
  threads: ThreadType[];
  visible_on_landing: boolean;
  x: number;
  y: number;
  is_hub?: boolean;
  essayFile?: string;
  created?: string;
  bioText?: string; // Bio text shown in phrase area on hover
}

// Runtime node with computed pixel positions
export interface NodePx extends Node {
  center: {
    x: number;
    y: number;
  };
}

// Thread connections between nodes
export interface Thread {
  from: string;
  to: string;
  threads: ThreadType[];
}

// Phrase for landing page rotation
export interface Phrase {
  text: string;
  by?: string;
}

// Curiosity map data
export interface ConnectedItem {
  label: string;
  linksTo: string | null;
}

export interface CuriosityData {
  id: string;
  title: string;
  central: string;
  connected: ConnectedItem[];
  threads: ThreadType[];
  visible_on_landing?: boolean;
}

// Durational content data (DJ mixes, talks, podcasts, presentations)
export type DurationalSubtype = 'dj-mix' | 'talk' | 'podcast' | 'presentation';
export type MediaSource = 'soundcloud' | 'mixcloud' | 'youtube' | 'vimeo' | 'spotify';

export interface DurationalMedia {
  source: MediaSource;
  url: string;
  embedUrl?: string;
  duration?: string;
}

export interface DurationalData {
  id: string;
  title: string;
  type: 'durational';
  subtype?: DurationalSubtype;
  description?: string;
  media: DurationalMedia;
  commentary?: string;
  created?: string;
  threads: ThreadType[];
}

// Essay node data (extended from node JSON)
export interface EssayNode extends Node {
  type: 'essay';
  essayFile: string;
}

// Thread color palettes
export type ThreadPalette = [string, string, string];

export interface ThreadPalettes {
  music: ThreadPalette;
  movement: ThreadPalette;
  questions: ThreadPalette;
}

// Application state
export interface AppState {
  // Data
  phrases: Phrase[];
  nodes: Node[];
  threads: Thread[];

  // UI state
  isContainerMode: boolean;
  activeNodeId: string | null;
  pendingNodeId: string | null;

  // Animation state
  isAnimatingContainer: boolean;
  isNodeSwitching: boolean;

  // DOM cache
  dotElementsById: Map<string, HTMLElement>;
  lastNodesPx: NodePx[];
}

// Placed curiosity item (for line drawing)
export interface PlacedItem {
  el: HTMLElement;
  cx: number;
  cy: number;
}
