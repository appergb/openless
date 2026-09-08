import { createContext } from 'react';

export const ChannelEditorHostContext = createContext<{
  container: HTMLDivElement | null;
  background: HTMLDivElement | null;
  registerClose: (close: (() => void) | null) => void;
} | null>(null);
