import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composerKeyAction } from './composerKeys.js';

const k = (key: string, shiftKey = false, isComposing = false) => ({ key, shiftKey, isComposing });

test('Enter sends', () => assert.equal(composerKeyAction(k('Enter')), 'send'));
test('Shift+Enter adds a line', () => assert.equal(composerKeyAction(k('Enter', true)), 'none'));
test('Enter during IME composition does not send', () => assert.equal(composerKeyAction(k('Enter', false, true)), 'none'));
test('other keys do nothing', () => assert.equal(composerKeyAction(k('a')), 'none'));
test('Enter with keyCode 229 does not send', () =>
  assert.equal(composerKeyAction({ key: 'Enter', shiftKey: false, isComposing: false, keyCode: 229 }), 'none'));
