// What Enter does in the composer
export function composerKeyAction(e: { key: string; shiftKey: boolean; isComposing: boolean; keyCode?: number }): 'send' | 'none' {
  return e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229 ? 'send' : 'none';
}
