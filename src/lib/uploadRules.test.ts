import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateUpload, base64ByteSize } from './uploadRules';

const MB = 1024 * 1024;

test('student accepts pdf and docx up to 10 MB', () => {
  assert.equal(validateUpload('paper.pdf', 10 * MB, 'student'), null);
  assert.equal(validateUpload('Paper.DOCX', 1, 'student'), null);
});

test('student rejects other types and files over 10 MB', () => {
  assert.match(validateUpload('notes.txt', 1, 'student')!, /Only/);
  assert.match(validateUpload('old.doc', 1, 'student')!, /Only/);
  assert.match(validateUpload('paper.pdf', 10 * MB + 1, 'student')!, /maximum size is 10 MB/);
});

test('admin rules stay pdf and txt up to 20 MB', () => {
  assert.equal(validateUpload('notes.txt', 20 * MB, 'admin'), null);
  assert.match(validateUpload('paper.docx', 1, 'admin')!, /Only/);
});

test('base64ByteSize decodes data URLs', () => {
  const bytes = Buffer.from('hello world');
  const dataUrl = `data:application/pdf;base64,${bytes.toString('base64')}`;
  assert.equal(base64ByteSize(dataUrl), bytes.length);
});
