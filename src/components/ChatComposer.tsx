import React, { useLayoutEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { CHAT_LIMITS, validateChatText } from '../lib/chat';
import { composerKeyAction } from '../lib/composerKeys';

interface ChatComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  sendDisabled?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({ value, onChange, onSend, onStop, streaming, sendDisabled, textareaRef }) => {
  const max = CHAT_LIMITS.maxMessageChars;
  const canSend = validateChatText(value).ok && !sendDisabled;
  const warnAt = max - 500;

  // Grows the textarea up to 192 px
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 192) + 'px';
  }, [value, textareaRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (composerKeyAction({ key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing, keyCode: e.keyCode }) === 'send') {
      e.preventDefault();
      if (!streaming) onSend();
    }
  };

  return (
    <div>
      <div className="flex items-end gap-2 bg-slate-950 border-2 border-slate-800 focus-within:border-indigo-500 rounded-2xl p-2 transition-colors">
        <textarea
          ref={textareaRef}
          rows={1}
          aria-label="Message"
          placeholder="Ask about the kiosk manuscripts"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 resize-none bg-transparent px-2 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none max-h-48"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop reply"
            className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send message"
            className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:hover:bg-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
      {value.length > warnAt && (
        <p className={`mt-1 text-right text-[10px] font-mono ${value.length > max ? 'text-red-400' : 'text-slate-500'}`}>
          {value.length} / {max}
        </p>
      )}
    </div>
  );
};
