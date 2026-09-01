/**
 * Uniform feedback for a mutating action.
 *
 * Most action handlers were bare `await someMutation.mutateAsync(...)`: no toast
 * on success, and on failure an unhandled rejection — the row simply did not
 * change and the operator was left guessing whether the server had refused
 * (deactivation guards, 409s, permission errors) or nothing had happened at all.
 *
 * `runAction` wraps the call so every action reports both outcomes. Pending state
 * still comes from the mutation's own `isPending` (wire it to the button's
 * `loading` / `disabled`), and the cache refresh stays with the mutation hook's
 * `onSuccess` invalidation — this only owns the feedback.
 */
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';

export interface RunActionOptions<T> {
  /** Toast shown on success. Omit for background actions that need no applause. */
  success?: string;
  /** Runs only after the action resolves (close a modal, navigate, clear a field). */
  onSuccess?: (result: T) => void;
}

/**
 * @returns true when the action succeeded, false when it threw. Never rethrows,
 * so callers can branch without a second try/catch.
 */
export async function runAction<T>(
  action: () => Promise<T>,
  options: RunActionOptions<T> = {}
): Promise<boolean> {
  try {
    const result = await action();
    if (options.success) toast.success(options.success);
    options.onSuccess?.(result);
    return true;
  } catch (err: unknown) {
    toast.error(getErrorMessage(err));
    return false;
  }
}
