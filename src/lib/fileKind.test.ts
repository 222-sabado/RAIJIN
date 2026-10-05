import test from 'node:test';
import assert from 'node:assert/strict';
import { fileKind, canDeleteManuscript } from './fileKind';

test('fileKind maps extension to kind', () => {
  assert.equal(fileKind('Paper.PDF'), 'pdf');
  assert.equal(fileKind('a.b.docx'), 'docx');
  assert.equal(fileKind('n.txt'), 'txt');
});

test('fileKind falls back to text when no file', () => {
  assert.equal(fileKind(undefined), 'text');
});

test('student deletes only own uploads', () => {
  assert.equal(canDeleteManuscript({ uploadedBy: '1234' }, { role: 'student', username: '1234' }), true);
  assert.equal(canDeleteManuscript({ uploadedBy: 'admin_group2' }, { role: 'student', username: '1234' }), false);
  assert.equal(canDeleteManuscript({ uploadedBy: 'x' }, { role: 'admin', username: 'admin_group2' }), true);
});
