'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface AiCopilotContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const AiCopilotContext = createContext<AiCopilotContextValue | null>(null);

export function AiCopilotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  return <AiCopilotContext.Provider value={value}>{children}</AiCopilotContext.Provider>;
}

export function useAiCopilot() {
  const ctx = useContext(AiCopilotContext);
  if (!ctx) throw new Error('useAiCopilot must be used within AiCopilotProvider');
  return ctx;
}
