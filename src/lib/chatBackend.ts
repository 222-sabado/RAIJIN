import { setTimeout as sleep } from 'node:timers/promises';
import type { ChatBackendStatus, ChatMessage, ChatSource } from './chat';

export type ChatBackendEvent =
  | { type: 'delta'; text: string }
  | { type: 'sources'; sources: ChatSource[] };

export interface ChatBackendInput {
  history: ChatMessage[];
  question: string;
}

export interface ChatBackend {
  status: ChatBackendStatus;
  // Must stop soon after the signal aborts
  reply(input: ChatBackendInput, signal: AbortSignal): AsyncIterable<ChatBackendEvent>;
}

export const PLACEHOLDER_REPLY =
  'The R.A.I.J.I.N. research assistant is not connected yet. Your message is saved in this chat. When the RAG service is connected, answers about the kiosk manuscripts will show here.';

// Three words per group, spaces kept
const GROUPS = PLACEHOLDER_REPLY.match(/(?:\S+\s*){1,3}/g) ?? [];

export const placeholderChatBackend: ChatBackend = {
  status: { connected: false, label: 'RAG NOT CONNECTED' },
  // Yields the fixed reply, 40 ms per group
  async *reply(_input, signal) {
    for (const text of GROUPS) {
      await sleep(40, undefined, { signal });
      yield { type: 'delta', text };
    }
  },
};
