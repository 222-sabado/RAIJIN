import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatStore, runChatTurn } from './chatServer';
import { PLACEHOLDER_REPLY, placeholderChatBackend, type ChatBackend, type ChatBackendInput } from './chatBackend';
import type { ChatStreamEvent } from './chat';

const U = 'u1';

function makeStore() {
  let n = 0;
  let t = 0;
  return createChatStore({
    newId: () => String(++n),
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++t)).toISOString(),
  });
}

function fake(reply: ChatBackend['reply']): ChatBackend {
  return { status: { connected: true, label: 'fake' }, reply };
}

const texts = (parts: string[]) =>
  fake(async function* () {
    for (const text of parts) yield { type: 'delta', text } as const;
  });

async function turn(
  store: ReturnType<typeof makeStore>,
  backend: ChatBackend,
  text: string,
  conversationId?: string,
  signal: AbortSignal = new AbortController().signal,
) {
  const events: ChatStreamEvent[] = [];
  const result = await runChatTurn({ store, backend, userId: U, conversationId, text, signal, emit: (e) => events.push(e) });
  return { events, result };
}

test('T-7 new chat streams start, deltas, done and stores both messages', async () => {
  const store = makeStore();
  const { events, result } = await turn(store, texts(['He', 'llo']), 'hi');
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(events.map((e) => e.type), ['start', 'delta', 'delta', 'done']);
  const done = events[3];
  assert.ok(done.type === 'done' && done.message.text === 'Hello');
  const start = events[0];
  assert.ok(start.type === 'start');
  assert.equal(store.get(U, start.conversation.id)?.messages.length, 2);
});

test('T-8 second turn passes history and trimmed question', async () => {
  const store = makeStore();
  const first = await turn(store, texts(['a']), 'one');
  const id = (first.events[0] as { conversation: { id: string } }).conversation.id;
  let seen: ChatBackendInput | undefined;
  await turn(store, fake(async function* (input) { seen = input; }), '  two  ', id);
  assert.equal(seen?.history.length, 2);
  assert.equal(seen?.question, 'two');
});

test('T-9 abort stores a stopped partial reply and emits nothing more', async () => {
  const store = makeStore();
  const ctl = new AbortController();
  const backend = fake(async function* () {
    yield { type: 'delta', text: 'part' } as const;
    ctl.abort();
    throw Object.assign(new Error('aborted'), { name: 'AbortError' });
  });
  const { events } = await turn(store, backend, 'hi', undefined, ctl.signal);
  assert.deepEqual(events.map((e) => e.type), ['start', 'delta']);
  const id = (events[0] as { conversation: { id: string } }).conversation.id;
  const last = store.get(U, id)!.messages[1];
  assert.equal(last.status, 'stopped');
  assert.equal(last.text, 'part');
});

test('T-9b abort without a throw also stores stopped', async () => {
  const store = makeStore();
  const ctl = new AbortController();
  const backend = fake(async function* () {
    yield { type: 'delta', text: 'p' } as const;
    ctl.abort();
  });
  const { events } = await turn(store, backend, 'hi', undefined, ctl.signal);
  assert.deepEqual(events.map((e) => e.type), ['start', 'delta']);
  const id = (events[0] as { conversation: { id: string } }).conversation.id;
  assert.equal(store.get(U, id)!.messages[1].status, 'stopped');
});

const boom = fake(async function* () {
  yield { type: 'delta', text: 'x' } as const;
  throw new Error('boom');
});

test('T-10 backend failure emits a generic error event and stores status error', async () => {
  const store = makeStore();
  const { events } = await turn(store, boom, 'hi');
  const last = events[events.length - 1];
  assert.ok(last.type === 'error');
  assert.equal(last.error, 'The assistant could not reply. Try again.');
  assert.equal(last.message?.status, 'error');
  assert.ok(!JSON.stringify(events).includes('boom'));
});

test('T-11 busy chat returns 409 and frees after release', async () => {
  const store = makeStore();
  const first = await turn(store, texts(['a']), 'one');
  const id = (first.events[0] as { conversation: { id: string } }).conversation.id;
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const slow = fake(async function* () {
    await gate;
    yield { type: 'delta', text: 'z' } as const;
  });
  const running = turn(store, slow, 'two', id);
  const second = await turn(store, texts(['b']), 'three', id);
  assert.deepEqual(second.result, { ok: false, status: 409, error: 'Wait for the current reply to finish.' });
  assert.deepEqual(second.events, []);
  release();
  await running;
  const third = await turn(store, texts(['c']), 'four', id);
  assert.deepEqual(third.result, { ok: true });
});

test('T-12 busy clears after a backend throw', async () => {
  const store = makeStore();
  const first = await turn(store, boom, 'hi');
  const id = (first.events[0] as { conversation: { id: string } }).conversation.id;
  const next = await turn(store, texts(['ok']), 'again', id);
  assert.deepEqual(next.result, { ok: true });
});

test('T-13 validation and unknown chat reject without events', async () => {
  const store = makeStore();
  const empty = await turn(store, texts(['a']), '   ');
  assert.deepEqual(empty.result, { ok: false, status: 400, error: 'Type a message first.' });
  assert.deepEqual(empty.events, []);
  const missing = await turn(store, texts(['a']), 'hi', 'chat-nope');
  assert.deepEqual(missing.result, { ok: false, status: 404, error: 'Chat not found.' });
  assert.deepEqual(missing.events, []);
});

test('T-14 full chat returns 409', async () => {
  const store = makeStore();
  const first = await turn(store, texts(['a']), 'm0');
  const id = (first.events[0] as { conversation: { id: string } }).conversation.id;
  for (let i = 1; i < 50; i++) await turn(store, texts(['a']), `m${i}`, id);
  assert.equal(store.get(U, id)!.messages.length, 100);
  const over = await turn(store, texts(['a']), 'more', id);
  assert.deepEqual(over.result, { ok: false, status: 409, error: 'This chat is full. Start a new chat.' });
});

test('T-15 51st chat removes the oldest; other users are unaffected', async () => {
  const store = makeStore();
  const ids: string[] = [];
  for (let i = 0; i < 51; i++) {
    const b = store.beginTurn(U, undefined, `c${i}`);
    assert.ok(b.ok);
    if (b.ok) {
      ids.push(b.conversation.id);
      store.finishTurn(U, b.conversation.id, { text: 'r', status: 'complete' });
    }
    if (i === 0) {
      const o = store.beginTurn('u2', undefined, 'other');
      assert.ok(o.ok);
      if (o.ok) store.finishTurn('u2', o.conversation.id, { text: 'r', status: 'complete' });
    }
  }
  assert.equal(store.list(U).length, 50);
  assert.equal(store.get(U, ids[0]), undefined);
  assert.ok(store.get(U, ids[50]));
  assert.equal(store.list('u2').length, 1);
});

test('T-16 list is newest first, remove is idempotent-false, get is per user', async () => {
  const store = makeStore();
  const a = await turn(store, texts(['a']), 'first');
  const b = await turn(store, texts(['a']), 'second');
  const idA = (a.events[0] as { conversation: { id: string } }).conversation.id;
  const idB = (b.events[0] as { conversation: { id: string } }).conversation.id;
  assert.deepEqual(store.list(U).map((c) => c.id), [idB, idA]);
  assert.equal(store.get('u2', idA), undefined);
  assert.equal(store.remove(U, idA), true);
  assert.equal(store.remove(U, idA), false);
  assert.deepEqual(store.list('nobody'), []);
});

test('chat deleted mid-stream finishes done and stores nothing', async () => {
  const store = makeStore();
  const backend = fake(async function* () {
    const id = store.list(U)[0].id;
    store.remove(U, id);
    yield { type: 'delta', text: 'x' } as const;
  });
  const { events } = await turn(store, backend, 'hi');
  assert.equal(events[events.length - 1].type, 'done');
  assert.deepEqual(store.list(U), []);
});

test('sources event is kept and stored on the reply', async () => {
  const store = makeStore();
  const src = [{ manuscriptId: 'm1', title: 'T' }];
  const backend = fake(async function* () {
    yield { type: 'sources', sources: src } as const;
    yield { type: 'delta', text: 'a' } as const;
  });
  const { events } = await turn(store, backend, 'hi');
  assert.deepEqual(events.map((e) => e.type), ['start', 'sources', 'delta', 'done']);
  const done = events[3];
  assert.ok(done.type === 'done');
  assert.deepEqual(done.message.sources, src);
});

test('T-17 placeholder deltas equal the fixed reply and it is not connected', async () => {
  let text = '';
  for await (const e of placeholderChatBackend.reply({ history: [], question: 'q' }, new AbortController().signal)) {
    if (e.type === 'delta') text += e.text;
  }
  assert.equal(text, PLACEHOLDER_REPLY);
  assert.equal(placeholderChatBackend.status.connected, false);
  assert.equal(placeholderChatBackend.status.label, 'RAG NOT CONNECTED');
});

test('T-18 placeholder stops fast after abort', async () => {
  const ctl = new AbortController();
  const start = Date.now();
  try {
    for await (const _ of placeholderChatBackend.reply({ history: [], question: 'q' }, ctl.signal)) ctl.abort();
  } catch (err: any) {
    assert.equal(err.name, 'AbortError');
  }
  assert.ok(Date.now() - start < 200);
});

const chatIdOf = (events: ChatStreamEvent[]) => (events[0] as { conversation: { id: string } }).conversation.id;

test('abort frees the turn even when the backend ignores the signal', async () => {
  const store = makeStore();
  const ctl = new AbortController();
  const stuck = fake(async function* () {
    yield { type: 'delta', text: 'first' } as const;
    await new Promise(() => {});
  });
  const events: ChatStreamEvent[] = [];
  const running = runChatTurn({
    store, backend: stuck, userId: U, text: 'hi', signal: ctl.signal,
    emit: (e) => {
      events.push(e);
      if (e.type === 'delta') ctl.abort();
    },
  });
  let guard!: NodeJS.Timeout;
  const hung = new Promise((r) => {
    guard = setTimeout(() => r('hung'), 500);
    guard.unref();
  });
  const outcome = await Promise.race([running, hung]);
  clearTimeout(guard);
  assert.deepEqual(outcome, { ok: true });
  const id = chatIdOf(events);
  const reply = store.get(U, id)!.messages[1];
  assert.equal(reply.status, 'stopped');
  assert.equal(reply.text, 'first');
  const next = await turn(store, texts(['ok']), 'again', id);
  assert.deepEqual(next.result, { ok: true });
});

test('abort before the first delta stores an empty stopped reply', async () => {
  const store = makeStore();
  const ctl = new AbortController();
  const stuck = fake(async function* () {
    ctl.abort();
    await new Promise(() => {});
  });
  const { events } = await turn(store, stuck, 'hi', undefined, ctl.signal);
  const reply = store.get(U, chatIdOf(events))!.messages[1];
  assert.equal(reply.status, 'stopped');
  assert.equal(reply.text, '');
});

test('a turn after an aborted turn is accepted', async () => {
  const store = makeStore();
  const ctl = new AbortController();
  const backend = fake(async function* () {
    yield { type: 'delta', text: 'p' } as const;
    ctl.abort();
  });
  const first = await turn(store, backend, 'one', undefined, ctl.signal);
  const next = await turn(store, texts(['ok']), 'two', chatIdOf(first.events));
  assert.deepEqual(next.result, { ok: true });
});

test('deleting a chat mid-stream stores nothing and later turns work', async () => {
  const store = makeStore();
  let deletedId = '';
  const backend = fake(async function* () {
    deletedId = store.list(U)[0].id;
    store.remove(U, deletedId);
    yield { type: 'delta', text: 'x' } as const;
  });
  await turn(store, backend, 'hi');
  const fresh = await turn(store, texts(['ok']), 'new');
  assert.deepEqual(fresh.result, { ok: true });
  assert.equal(store.get(U, deletedId), undefined);
  const gone = await turn(store, texts(['ok']), 'x', deletedId);
  assert.equal(gone.result.ok === false && gone.result.status, 404);
});
