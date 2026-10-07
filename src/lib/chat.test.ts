import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChatText, makeTitle, encodeChatEvent, readNdjson, type ChatStreamEvent } from './chat';

const EMPTY = 'Type a message first.';
const LONG = 'A message can have 4000 characters or fewer.';

function streamOf(...chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const b of chunks) c.enqueue(b);
      c.close();
    },
  });
}

test('T-1 validateChatText trims and enforces limits', () => {
  assert.deepEqual(validateChatText('  hi  '), { ok: true, text: 'hi' });
  for (const bad of ['   ', '', undefined, 42]) {
    assert.deepEqual(validateChatText(bad), { ok: false, error: EMPTY });
  }
  assert.equal(validateChatText('x'.repeat(4000)).ok, true);
  assert.deepEqual(validateChatText('x'.repeat(4001)), { ok: false, error: LONG });
});

test('T-2 makeTitle collapses whitespace and truncates', () => {
  assert.equal(makeTitle('a\n\n  b'), 'a b');
  assert.equal(makeTitle('x'.repeat(61)), 'x'.repeat(60) + '…');
  assert.equal(makeTitle('x'.repeat(60)), 'x'.repeat(60));
});

test('T-3 encodeChatEvent ends with one newline and round-trips', () => {
  const event: ChatStreamEvent = { type: 'delta', text: 'a\nb' };
  const line = encodeChatEvent(event);
  assert.ok(line.endsWith('\n'));
  assert.equal(line.indexOf('\n'), line.length - 1);
  assert.deepEqual(JSON.parse(line), event);
});

test('T-4 readNdjson joins lines split across chunks', async () => {
  const enc = new TextEncoder();
  const l1 = encodeChatEvent({ type: 'delta', text: 'one' });
  const l2 = encodeChatEvent({ type: 'delta', text: 'two' });
  const all = enc.encode(l1 + '\n' + l2);
  const cut = l1.length + 3;
  const got: ChatStreamEvent[] = [];
  await readNdjson(streamOf(all.slice(0, 5), all.slice(5, cut), all.slice(cut)), (e) => got.push(e));
  assert.deepEqual(got, [
    { type: 'delta', text: 'one' },
    { type: 'delta', text: 'two' },
  ]);
});

test('T-5 readNdjson decodes split UTF-8 and a last line without newline', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ type: 'delta', text: 'é' }));
  const e1 = bytes.indexOf(0xc3);
  const first = new TextEncoder().encode(encodeChatEvent({ type: 'delta', text: 'a' }));
  const got: ChatStreamEvent[] = [];
  await readNdjson(streamOf(first, bytes.slice(0, e1 + 1), bytes.slice(e1 + 1)), (e) => got.push(e));
  assert.deepEqual(got, [
    { type: 'delta', text: 'a' },
    { type: 'delta', text: 'é' },
  ]);
});

test('T-6 readNdjson rejects a bad line', async () => {
  await assert.rejects(
    readNdjson(streamOf(new TextEncoder().encode('not json\n')), () => {}),
    { message: 'Bad stream line' },
  );
});
