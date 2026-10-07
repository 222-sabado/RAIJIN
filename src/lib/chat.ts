export type ChatRole = 'user' | 'assistant';
export type ChatMessageStatus = 'complete' | 'stopped' | 'error';

export interface ChatSource {
  manuscriptId: string;
  title: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  status: ChatMessageStatus;
  sources?: ChatSource[];
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ChatConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ChatBackendStatus {
  connected: boolean;
  label: string;
}

export type ChatStreamEvent =
  | { type: 'start'; conversation: ChatConversationSummary; userMessage: ChatMessage }
  | { type: 'delta'; text: string }
  | { type: 'sources'; sources: ChatSource[] }
  | { type: 'done'; message: ChatMessage }
  | { type: 'error'; error: string; message?: ChatMessage };

export const CHAT_LIMITS = {
  maxMessageChars: 4000,
  maxMessagesPerConversation: 100,
  maxConversationsPerUser: 50,
  titleChars: 60,
} as const;

// Returns trimmed text, or an error string
export function validateChatText(text: unknown): { ok: true; text: string } | { ok: false; error: string } {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) return { ok: false, error: 'Type a message first.' };
  if (t.length > CHAT_LIMITS.maxMessageChars) {
    return { ok: false, error: `A message can have ${CHAT_LIMITS.maxMessageChars} characters or fewer.` };
  }
  return { ok: true, text: t };
}

// Chat title from the first message
export function makeTitle(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > CHAT_LIMITS.titleChars ? t.slice(0, CHAT_LIMITS.titleChars) + '…' : t;
}

// One NDJSON line for a stream event
export function encodeChatEvent(event: ChatStreamEvent): string {
  return JSON.stringify(event) + '\n';
}

// Reads an NDJSON body and calls onEvent per line
export async function readNdjson(body: ReadableStream<Uint8Array>, onEvent: (e: ChatStreamEvent) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const flushLine = (line: string) => {
    if (!line.trim()) return;
    let event: ChatStreamEvent;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error('Bad stream line');
    }
    onEvent(event);
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      flushLine(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
  }
  flushLine(buffer + decoder.decode());
}
