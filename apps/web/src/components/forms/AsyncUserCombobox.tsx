'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, nbFocusRing } from '@/lib/utils/cn';
import { useWheelScrollFix } from '@/lib/hooks/useWheelScrollFix';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { Label, Popover, PopoverAnchor, PopoverContent } from '@/components/ui';
import { useUsers } from '@/lib/api/users';

const PAGE = 10;

/** The picked user, reported alongside the id so callers can render it without
 *  refetching (or preloading the whole roster just to resolve a name). */
export interface PickedUser {
  id: string;
  full_name: string;
  role: string;
  phone_number?: string;
}

export interface AsyncUserComboboxProps {
  value?: string;
  onValueChange: (value: string, user?: PickedUser) => void;
  placeholder?: string;
  /** Restrict to these role codes (client-side). */
  roles?: string[];
  /** Hide these user ids (e.g. the PIC when picking members). */
  excludeIds?: string[];
  /** Label for the selected value when it isn't in the loaded page (edit flow). */
  initialLabel?: string;
  /** Field label (renders a labelled wrapper when set). */
  label?: string;
  error?: string;
  helperText?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * Server-searched, lazily-paginated single user picker. Loads 10 at a time,
 * fetches more on scroll (or the "load more" button), and type-to-search hits
 * the API (debounced) rather than filtering a preloaded roster — so it scales to
 * thousands of workers without loading them all up front.
 */
export function AsyncUserCombobox({
  value,
  onValueChange,
  placeholder: _placeholder,
  roles,
  excludeIds,
  initialLabel,
  label,
  error,
  helperText,
  required,
  disabled,
  id: _id,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: AsyncUserComboboxProps): React.JSX.Element {
  const { t } = useTranslation(['common']);
  const reactId = React.useId();
  const id = _id ?? reactId;
  const messageId = `${id}-message`;
  const invalid = ariaInvalid ?? !!error;
  const placeholder = _placeholder ?? t('common:ui.combobox.placeholder');
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [limit, setLimit] = React.useState(PAGE);
  const [labelCache, setLabelCache] = React.useState<Record<string, string>>({});
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = useWheelScrollFix<HTMLUListElement>();
  const debounced = useDebounce(query.trim(), 300);

  // Role filtering is server-side (so pagination + "load more" stay correct even
  // when the first page has no matching roles); excludeIds is a small client tweak.
  //
  // A disabled picker fetches NOTHING. It stays mounted so the form doesn't
  // reflow as a role is chosen, but an un-narrowed query would pull the whole
  // roster — the exact cost the role step exists to avoid.
  const { data, isFetching } = useUsers(
    // Active accounts only: this picker assigns work (schedules, teams, tasks),
    // and a deactivated account must not be assignable.
    { search: debounced || undefined, roles, is_active: true, page: 1, limit },
    { enabled: !disabled }
  );
  const raw = React.useMemo(() => data?.data ?? [], [data]);
  const total = data?.meta?.total ?? 0;
  const users = React.useMemo(
    () => raw.filter((u) => !(excludeIds?.includes(u.id) ?? false)),
    [raw, excludeIds]
  );
  const hasMore = raw.length < total;

  const selectedLabel = value ? (labelCache[value] ?? initialLabel ?? '…') : '';

  const onScroll = (e: React.UIEvent<HTMLUListElement>): void => {
    const el = e.currentTarget;
    if (!isFetching && hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
      setLimit((l) => l + PAGE);
    }
  };

  const pick = (user: PickedUser): void => {
    setLabelCache((prev) => ({ ...prev, [user.id]: user.full_name }));
    onValueChange(user.id, user);
    setOpen(false);
  };

  const trigger = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={error || helperText ? messageId : ariaDescribedBy}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex min-h-[48px] w-full items-center justify-between gap-2 rounded-nb-base border-2 border-nb-black bg-nb-white px-4 text-base text-nb-black shadow-nb-md',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
            invalid && 'border-nb-danger',
            nbFocusRing
          )}
        >
          <span className={cn('truncate', !selectedLabel && 'text-nb-gray-500')}>
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-nb-gray-500" aria-hidden />
        </button>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="flex items-center gap-2 border-b-2 border-nb-black px-3">
          <Search className="h-4 w-4 shrink-0 text-nb-gray-500" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder={t('common:ui.combobox.searchPlaceholder')}
            className="h-11 w-full bg-transparent text-nb-body-sm text-nb-black outline-none placeholder:text-nb-gray-500"
          />
        </div>
        <ul
          ref={listRef}
          role="listbox"
          onScroll={onScroll}
          className="max-h-60 overflow-y-auto p-1"
        >
          {users.length === 0 && !isFetching ? (
            <li className="px-3 py-2 text-nb-body-sm text-nb-gray-500">
              {t('common:ui.combobox.noResults')}
            </li>
          ) : (
            users.map((u) => {
              const isSelected = u.id === value;
              return (
                <li
                  key={u.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() =>
                    pick({
                      id: u.id,
                      full_name: u.full_name,
                      role: u.role,
                      phone_number: u.phone_number,
                    })
                  }
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-nb-sm px-3 py-2 text-nb-body-sm hover:bg-nb-gray-100',
                    isSelected && 'font-bold'
                  )}
                >
                  {/* The role is already chosen upstream, so repeating it here
                      says nothing. The phone number is what tells two workers
                      with the same name apart — fall back to the username when a
                      worker has no phone on file. */}
                  <span className="truncate">
                    {u.full_name}
                    <span className="ml-1 text-nb-caption text-nb-gray-500">
                      {u.phone_number ? `— ${u.phone_number}` : `(${u.username})`}
                    </span>
                  </span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                </li>
              );
            })
          )}
          {isFetching ? (
            <li className="px-3 py-2 text-center text-nb-caption text-nb-gray-500">
              {t('common:loading')}
            </li>
          ) : hasMore ? (
            <li className="p-1">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className={cn(
                  'w-full rounded-nb-sm border-2 border-nb-black bg-nb-white py-1.5 text-nb-caption font-bold hover:bg-nb-gray-50',
                  nbFocusRing
                )}
              >
                {t('common:ui.combobox.loadMore')}
              </button>
            </li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );

  if (!label) return trigger;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-nb-danger">*</span>}
      </Label>
      {trigger}
      {error ? (
        <p id={messageId} className="text-nb-body-sm font-medium text-nb-danger" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={messageId} className="text-nb-body-sm text-nb-gray-600">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
