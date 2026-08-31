'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { FeedbackCreatePayload, FeedbackListItem } from '@/lib/feedback/feedback-input';
import { useStore } from '@/hooks/useStore';

export type CreateFeedbackOutcome =
  | { ok: true; feedback: FeedbackListItem }
  | { ok: false; error: 'save_failed'; message: string };

type CreateFeedbackResponse = {
  ok?: boolean;
  error?: string;
  data?: FeedbackListItem;
};

async function readJson(res: Response): Promise<CreateFeedbackResponse> {
  try {
    return (await res.json()) as CreateFeedbackResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useCreateFeedback() {
  const addFeedback = useStore((s) => s.addFeedback);

  const createFeedback = useCallback(
    async (feedback: FeedbackCreatePayload): Promise<CreateFeedbackOutcome> => {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.data) {
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể lưu feedback.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        addFeedback(body.data as Record<string, unknown>);
      });

      return { ok: true, feedback: body.data };
    },
    [addFeedback],
  );

  return { createFeedback };
}
