import React, { useEffect, useRef, useState } from 'react';
import { Bot, MessageSquare, PanelLeft, SquarePen, Trash2, X } from 'lucide-react';
import { User } from '../types';
import { safeFetchJson } from '../lib/api';
import {
  ChatBackendStatus,
  ChatConversation,
  ChatConversationSummary,
  ChatMessage,
  readNdjson,
  validateChatText,
} from '../lib/chat';
import { ChatComposer } from './ChatComposer';
import { MessageBody } from './MessageBody';

interface ChatTabProps {
  user: User;
}

const SUGGESTIONS = [
  'Find manuscripts about wave propagation',
  'Summarize a manuscript about power systems',
  'Compare two control methods for motors',
];

const TMP_USER = 'tmp-user';
const TMP_ASSISTANT = 'tmp-assistant';

export const ChatTab: React.FC<ChatTabProps> = ({ user }) => {
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [backend, setBackend] = useState<ChatBackendStatus | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [liveText, setLiveText] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const wasOpenRef = useRef(false);
  const seqRef = useRef(0);
  const pendingRef = useRef<{ text: string; started: boolean } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatsButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const base = `/api/user/${user.id}/chats`;
  const activeTitle = conversations.find((c) => c.id === activeId)?.title;

  useEffect(() => {
    let cancelled = false;
    safeFetchJson<{ conversations: ChatConversationSummary[]; backend: ChatBackendStatus }>(base).then((data) => {
      if (cancelled) return;
      if (!data) {
        setError('Chats could not load. Try again later.');
        return;
      }
      setConversations(data.conversations);
      setBackend(data.backend);
    });
    if (window.matchMedia('(max-width: 767px)').matches) {
      panelRef.current?.scrollIntoView({ block: 'start' });
    }
    return () => {
      cancelled = true;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [base]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => e.matches && setListOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (listOpen) {
      wasOpenRef.current = true;
      overlayRef.current?.querySelector('button')?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      chatsButtonRef.current?.focus();
    }
  }, [listOpen]);

  // Ends the stream and ignores its late events
  const detachStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    const p = pendingRef.current;
    pendingRef.current = null;
    if (p && !p.started) setDraft((cur) => cur || p.text);
  };

  // Closes the phone list and returns focus
  const closeList = () => setListOpen(false);

  // Keeps Tab inside the phone list
  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') return closeList();
    if (e.key !== 'Tab') return;
    const items = Array.from(e.currentTarget.querySelectorAll('button')) as HTMLElement[];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const startNewChat = () => {
    detachStream();
    seqRef.current++;
    setLoadingChat(false);
    setActiveId(null);
    setMessages([]);
    setError(null);
    if (listOpen) closeList();
    else textareaRef.current?.focus();
  };

  const openChat = async (id: string) => {
    detachStream();
    const seq = ++seqRef.current;
    setActiveId(id);
    setMessages([]);
    setLoadingChat(true);
    setError(null);
    if (listOpen) closeList();
    const data = await safeFetchJson<{ conversation: ChatConversation }>(`${base}/${id}`);
    if (seqRef.current !== seq) return;
    setLoadingChat(false);
    if (!data) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setActiveId(null);
      setMessages([]);
      setError('This chat no longer exists.');
      return;
    }
    setMessages(data.conversation.messages);
  };

  const deleteChat = async (c: ChatConversationSummary) => {
    if (!confirm(`Delete the chat "${c.title}"?`)) return;
    try {
      const res = await fetch(`${base}/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      setConversations((prev) => prev.filter((x) => x.id !== c.id));
      if (c.id === activeId) startNewChat();
    } catch {
      setError('The chat could not be deleted.');
    }
  };

  const pickSuggestion = (s: string) => {
    setDraft(s);
    textareaRef.current?.focus();
  };

  const sendMessage = async () => {
    if (streaming || loadingChat || !validateChatText(draft).ok) return;
    const sentText = draft;
    const controller = new AbortController();
    abortRef.current = controller;
    seqRef.current++;
    const pending = { text: sentText, started: false };
    pendingRef.current = pending;
    const isCurrent = () => abortRef.current === controller;
    const now = new Date().toISOString();
    const patchAssistant = (patch: Partial<ChatMessage>) =>
      setMessages((prev) => prev.map((m) => (m.id === TMP_ASSISTANT ? { ...m, ...patch } : m)));
    const dropTemps = () => setMessages((prev) => prev.filter((m) => m.id !== TMP_USER && m.id !== TMP_ASSISTANT));
    const restore = (message: string) => {
      dropTemps();
      setDraft((cur) => cur || sentText);
      if (message) setError(message);
    };

    setError(null);
    setDraft('');
    setMessages((prev) => [
      ...prev,
      { id: TMP_USER, role: 'user', text: sentText.trim(), createdAt: now, status: 'complete' },
      { id: TMP_ASSISTANT, role: 'assistant', text: '', createdAt: now, status: 'complete' },
    ]);
    setStreaming(true);
    setLiveText('Assistant is replying.');

    let started = false;
    let ended = false;
    try {
      const res = await fetch(`${base}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeId ?? undefined, text: sentText }),
        signal: controller.signal,
      });
      if (!isCurrent()) return;
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        if (!isCurrent()) return;
        restore(body?.error || 'The message could not be sent.');
        return;
      }
      await readNdjson(res.body, (ev) => {
        if (!isCurrent()) return;
        if (ev.type === 'start') {
          started = true;
          pending.started = true;
          setMessages((prev) => prev.map((m) => (m.id === TMP_USER ? ev.userMessage : m)));
          setActiveId((cur) => cur ?? ev.conversation.id);
          setConversations((prev) => [ev.conversation, ...prev.filter((c) => c.id !== ev.conversation.id)]);
        } else if (ev.type === 'delta') {
          setMessages((prev) => prev.map((m) => (m.id === TMP_ASSISTANT ? { ...m, text: m.text + ev.text } : m)));
        } else if (ev.type === 'sources') {
          patchAssistant({ sources: ev.sources });
        } else if (ev.type === 'done') {
          ended = true;
          setMessages((prev) => prev.map((m) => (m.id === TMP_ASSISTANT ? ev.message : m)));
          setLiveText(ev.message.text);
        } else if (ev.type === 'error') {
          ended = true;
          if (ev.message) setMessages((prev) => prev.map((m) => (m.id === TMP_ASSISTANT ? ev.message! : m)));
          else patchAssistant({ status: 'error' });
          setLiveText('The reply did not finish.');
        }
      });
      if (isCurrent() && !ended) {
        patchAssistant({ status: 'error' });
        setLiveText('The reply did not finish.');
      }
    } catch (err) {
      if (!isCurrent()) return;
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      if (aborted) {
        if (started) patchAssistant({ status: 'stopped' });
        else restore('');
        setLiveText('Reply stopped.');
      } else {
        console.error('[Chat] Send failed');
        if (started) {
          patchAssistant({ status: 'error' });
          setLiveText('The reply did not finish.');
        } else {
          restore('The server did not respond. Check the connection and try again.');
        }
      }
    } finally {
      if (isCurrent()) {
        const stamp = Date.now();
        setMessages((prev) =>
          prev.map((m) => (m.id === TMP_USER || m.id === TMP_ASSISTANT ? { ...m, id: `local-${stamp}-${m.role}` } : m)),
        );
        abortRef.current = null;
        pendingRef.current = null;
        setStreaming(false);
        textareaRef.current?.focus();
      }
    }
  };

  const stopReply = () => abortRef.current?.abort();

  const listBody = (inOverlay: boolean) => (
    <>
      <div className="p-3 flex items-center gap-2">
        <button
          type="button"
          onClick={startNewChat}
          className="flex-1 px-3.5 py-3 rounded-xl flex items-center space-x-3 text-xs font-extrabold uppercase tracking-wider text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all"
        >
          <SquarePen className="w-4 h-4" />
          <span>New chat</span>
        </button>
        {inOverlay && (
          <button
            type="button"
            onClick={closeList}
            aria-label="Close chats"
            className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {conversations.length === 0 ? (
          <p className="text-xs text-slate-500 px-3">No chats yet.</p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center rounded-xl transition-all ${
                c.id === activeId ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <button
                type="button"
                onClick={() => openChat(c.id)}
                aria-current={c.id === activeId ? 'true' : undefined}
                className="flex-1 min-w-0 px-3.5 py-3 text-left text-xs font-bold truncate rounded-xl"
              >
                {c.title}
              </button>
              <button
                type="button"
                onClick={() => deleteChat(c)}
                aria-label={`Delete chat ${c.title}`}
                className="w-9 h-9 mr-1 shrink-0 rounded-lg flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 hover:bg-black/20"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );

  const bubbleText = 'text-sm leading-relaxed break-words [overflow-wrap:anywhere]';

  return (
    <div
      ref={panelRef}
      className="scroll-mt-20 relative flex h-[calc(100dvh-6.0625rem)] sm:h-[calc(100dvh-7.0625rem)] lg:h-[calc(100dvh-8.0625rem)] min-h-[480px] max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
    >
      <div className="sr-only" aria-live="polite">{liveText}</div>

      <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-800 flex-col" aria-label="Chat list">
        {listBody(false)}
      </aside>

      {listOpen && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-label="Chats"
          aria-modal="true"
          onKeyDown={trapTab}
          className="lg:hidden absolute inset-0 z-10 bg-slate-900 flex flex-col"
        >
          {listBody(true)}
        </div>
      )}

      <section className="flex-1 min-w-0 flex flex-col" inert={listOpen}>
        <header className="px-4 sm:px-6 py-4 border-b border-slate-800 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              ref={chatsButtonRef}
              type="button"
              onClick={() => setListOpen(true)}
              className="lg:hidden shrink-0 px-3 py-2 rounded-xl flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
            >
              <PanelLeft className="w-4 h-4" />
              <span>Chats</span>
            </button>
            <div className="min-w-0">
              <span className="text-xs font-bold text-indigo-400 tracking-tighter uppercase italic block truncate">
                R.A.I.J.I.N. ASSISTANT
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase italic truncate">
                {activeTitle ?? 'New chat'}
              </h2>
            </div>
          </div>
          {backend && !backend.connected && (
            <div className="order-last basis-full sm:order-none sm:basis-auto shrink-0">
              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                {backend.label}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={startNewChat}
            aria-label="New chat"
            className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
          >
            <SquarePen className="w-4 h-4" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
          {loadingChat ? (
            <p className="text-xs text-slate-500" role="status">Loading chat.</p>
          ) : messages.length === 0 ? (
            <div className="min-h-full flex flex-col items-center justify-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase italic text-center">
                Ask the R.A.I.J.I.N. assistant
              </h3>
              {backend && !backend.connected && (
                <p className="text-sm text-slate-400 text-center max-w-md">
                  The assistant is not connected yet. You can send messages now. Answers come when the RAG service is connected.
                </p>
              )}
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-2 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-xs font-bold text-slate-300 text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.role === 'user' ? (
                <div
                  key={m.id}
                  className={`w-fit max-w-[85%] sm:max-w-[75%] ml-auto bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3 whitespace-pre-wrap ${bubbleText}`}
                >
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-2 min-w-0">
                  <div className="w-7 h-7 shrink-0 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div
                    className={`min-w-0 max-w-[85%] sm:max-w-[75%] bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl rounded-bl-md px-4 py-3 ${bubbleText}`}
                  >
                    {m.text ? (
                      <MessageBody text={m.text} />
                    ) : m.status === 'complete' && streaming ? (
                      <div className="flex items-center gap-1.5 h-5" aria-hidden="true">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </div>
                    ) : null}
                    {m.status === 'stopped' && (
                      <p className={`text-xs text-slate-500 italic ${m.text ? 'mt-2' : ''}`}>Reply stopped.</p>
                    )}
                    {m.status === 'error' && (
                      <p className={`text-xs text-red-400 ${m.text ? 'mt-2' : ''}`}>The reply did not finish.</p>
                    )}
                  </div>
                </div>
              ),
            )
          )}
        </div>

        <div className="border-t border-slate-800 p-3 sm:p-4 space-y-2">
          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}
          <ChatComposer
            value={draft}
            onChange={setDraft}
            onSend={sendMessage}
            onStop={stopReply}
            streaming={streaming}
            sendDisabled={loadingChat}
            textareaRef={textareaRef}
          />
        </div>
      </section>
    </div>
  );
};
