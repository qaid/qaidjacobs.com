/**
 * CMS Server Types
 * Extends base types from src/types with CMS-specific interfaces
 */

// Re-export base types
export type {
  Node,
  NodeType,
  ThreadType,
  Thread,
  Phrase,
  CuriosityData,
  ConnectedItem,
  DurationalData,
  DurationalSubtype,
  MediaSource,
  DurationalMedia,
} from '../../src/types/index.js';

// API request/response types
export interface CreateNodeRequest {
  node: Partial<Node>;
  essayContent?: string;
  curiosityData?: Partial<CuriosityData>;
  durationalData?: Partial<DurationalData>;
}

export interface UpdateNodeRequest {
  node: Partial<Node>;
  essayContent?: string;
  curiosityData?: Partial<CuriosityData>;
  durationalData?: Partial<DurationalData>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// File operation types
export interface BackupInfo {
  originalPath: string;
  backupPath: string;
  timestamp: string;
}

import type { Node, CuriosityData, DurationalData } from '../../src/types/index.js';
