// Server-only. Do not import from components.
import {
  CHAT_LIMITS,
  makeTitle,
  validateChatText,
  type ChatConversation,
  type ChatConversationSummary,
  type ChatMessage,
  type ChatMessageStatus,
  type ChatSource,
  type ChatStreamEvent,
} from './chat';
import type { ChatBackend } from './chatBackend';

type Fail = { ok: false; status: 400 | 404 | 409; error: string };

export interface ChatStore {
  list(userId: string): ChatConversationSummary[];
  get(userId: string, chatId: string): ChatConversation | undefined;
  remove(userId: string, chatId: string): boolean;
  beginTurn(userId: string, chatId: string | undefined, text: string):
    | { ok: true; conversation: ChatConversation; userMessage: ChatMessage }
    | Fail;
  finishTurn(userId: string, chatId: string, reply: { text: string; status: ChatMessageStatus; sources?: ChatSource[] }): ChatMessage;
}

// In-memory chats, keyed by user id
export function createChatStore(opts: { now?: () => string; newId?: () => string } = {}): ChatStore {
  const now = opts.now ?? (() => new Date().toISOString());
  const newId = opts.newId ?? (() => crypto.randomUUID());
  const chats = new Map<string, Map<string, ChatConversation>>();
  const busy = new Set<string>();
  const key = (userId: string, chatId: string) => `${userId}\u0000${chatId}`;
  const message = (role: ChatMessage['role'], text: string, status: ChatMessageStatus): ChatMessage => ({
    id: `msg-${newId()}`,
    role,
    text,
    createdAt: now(),
    status,
  });

  return {
    list: (userId) =>
      [...(chats.get(userId)?.values() ?? [])]
        .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0)),
    get: (userId, chatId) => chats.get(userId)?.get(chatId),
    remove(userId, chatId) {
      busy.delete(key(userId, chatId));
      return chats.get(userId)?.delete(chatId) ?? false;
    },
    beginTurn(userId, chatId, text) {
      const valid = validateChatText(text);
      if ('error' in valid) return { ok: false, status: 400, error: valid.error };
      let conversation: ChatConversation | undefined;
      if (chatId !== undefined) {
        conversation = chats.get(userId)?.get(chatId);
        if (!conversation) return { ok: false, status: 404, error: 'Chat not found.' };
        if (busy.has(key(userId, chatId))) return { ok: false, status: 409, error: 'Wait for the current reply to finish.' };
        if (conversation.messages.length >= CHAT_LIMITS.maxMessagesPerConversation) {
          return { ok: false, status: 409, error: 'This chat is full. Start a new chat.' };
        }
      } else {
        const stamp = now();
        conversation = { id: `chat-${newId()}`, title: makeTitle(valid.text), createdAt: stamp, updatedAt: stamp, messages: [] };
        const mine = chats.get(userId) ?? new Map<string, ChatConversation>();
        chats.set(userId, mine);
        mine.set(conversation.id, conversation);
        if (mine.size > CHAT_LIMITS.maxConversationsPerUser) {
          let oldest: ChatConversation | undefined;
          for (const c of mine.values()) {
            if (c !== conversation && (!oldest || c.updatedAt < oldest.updatedAt)) oldest = c;
          }
          if (oldest) mine.delete(oldest.id);
        }
      }
      const userMessage = message('user', valid.text, 'complete');
      conversation.messages.push(userMessage);
      conversation.updatedAt = userMessage.createdAt;
      busy.add(key(userId, conversation.id));
      return { ok: true, conversation, userMessage };
    },
    finishTurn(userId, chatId, reply) {
      busy.delete(key(userId, chatId));
      const msg = message('assistant', reply.text, reply.status);
      if (reply.sources) msg.sources = reply.sources;
      const conversation = chats.get(userId)?.get(chatId);
      if (conversation) {
        conversation.messages.push(msg);
        conversation.updatedAt = msg.createdAt;
      }
      return msg;
    },
  };
}

// Runs one turn and emits stream events
export async function runChatTurn(args: {
  store: ChatStore;
  backend: ChatBackend;
  userId: string;
  conversationId?: string;
  text: string;
  signal: AbortSignal;
  emit: (event: ChatStreamEvent) => void;
}): Promise<{ ok: true } | Fail> {
  const { store, backend, userId, signal, emit } = args;
  const begun = store.beginTurn(userId, args.conversationId, args.text);
  if (!begun.ok) return begun;
  const { conversation, userMessage } = begun;
  const chatId = conversation.id;
  let buffer = '';
  let sources: ChatSource[] | undefined;
  let finished = false;
  const finish = (status: ChatMessageStatus) => {
    finished = true;
    return store.finishTurn(userId, chatId, { text: buffer, status, sources });
  };
  let onAbort = () => {};
  const aborted = new Promise<'abort'>((resolve) => {
    onAbort = () => resolve('abort');
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    emit({
      type: 'start',
      conversation: { id: chatId, title: conversation.title, updatedAt: conversation.updatedAt },
      userMessage,
    });
    const history = conversation.messages.slice(0, -1);
    const it = backend.reply({ history, question: userMessage.text }, signal)[Symbol.asyncIterator]();
    for (;;) {
      const pending = it.next();
      pending.catch(() => {});
      const step = await Promise.race([pending, aborted]);
      if (step === 'abort' || signal.aborted) {
        Promise.resolve(it.return?.()).catch(() => {});
        break;
      }
      if (step.done) break;
      if (step.value.type === 'delta') buffer += step.value.text;
      else sources = step.value.sources;
      emit(step.value);
    }
    if (signal.aborted) finish('stopped');
    else emit({ type: 'done', message: finish('complete') });
  } catch (err: any) {
    if (!finished) {
      if (signal.aborted) finish('stopped');
      else {
        console.error('Chat backend error:', err?.name);
        emit({ type: 'error', error: 'The assistant could not reply. Try again.', message: finish('error') });
      }
    }
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
  return { ok: true };
}
