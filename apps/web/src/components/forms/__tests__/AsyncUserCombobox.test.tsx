/**
 * Unit tests: AsyncUserCombobox — the server-paged single user picker.
 *
 * The point of this component is that it never loads the roster (~3000 workers)
 * to render: it asks the API for 10 at a time, filters by role SERVER-side, and
 * searches with a debounced query. So the load-bearing assertions here are about
 * what it asks the API for, and what it reports back — neither of which the DOM
 * alone can show.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AsyncUserCombobox } from '../AsyncUserCombobox';
import { useUsers } from '@/lib/api/users';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/lib/api/users', () => ({ useUsers: jest.fn() }));

type TestUser = {
  id: string;
  full_name: string;
  username: string;
  role: string;
  phone_number?: string;
};

function setup(
  opts: {
    users?: TestUser[];
    onValueChange?: jest.Mock;
    value?: string;
    roles?: string[];
    disabled?: boolean;
  } = {}
) {
  const { users = [], onValueChange = jest.fn(), value, roles = ['satgas'], disabled } = opts;
  (useUsers as jest.Mock).mockReturnValue({
    data: { data: users, meta: { total: users.length } },
    isFetching: false,
  });
  render(
    <AsyncUserCombobox
      value={value}
      onValueChange={onValueChange}
      roles={roles}
      disabled={disabled}
    />
  );
  return { onValueChange };
}

beforeEach(() => jest.clearAllMocks());

// The role is chosen before the worker list opens, so repeating it here says
// nothing. Two workers can share a name ("Linmas Barat 1 Satu") and the phone
// number is what tells them apart.
describe('AsyncUserCombobox — identifying a worker', () => {
  it('shows the phone number beside the name', async () => {
    const user = userEvent.setup();
    setup({
      users: [
        {
          id: 'u1',
          full_name: 'Budi Santoso',
          username: 'budi',
          role: 'satgas',
          phone_number: '081200000006',
        },
      ],
    });

    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByText(/081200000006/)).toBeInTheDocument();
  });

  it('falls back to the username when a worker has no phone on file', async () => {
    const user = userEvent.setup();
    setup({ users: [{ id: 'u2', full_name: 'Sari Dewi', username: 'sari', role: 'satgas' }] });

    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByText(/\(sari\)/)).toBeInTheDocument();
  });

  it('reports the picked user so callers can label it without a refetch', async () => {
    // Nothing else in a form knows a user's name — the roster is never loaded.
    const user = userEvent.setup();
    const { onValueChange } = setup({
      users: [
        {
          id: 'u1',
          full_name: 'Budi Santoso',
          username: 'budi',
          role: 'satgas',
          phone_number: '0812',
        },
      ],
    });

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText(/Budi Santoso/));

    expect(onValueChange).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ id: 'u1', full_name: 'Budi Santoso', phone_number: '0812' })
    );
  });
});

describe('AsyncUserCombobox — never loads the roster', () => {
  it('asks the API for one page, filtered to the given roles', () => {
    setup({ users: [] });

    expect(useUsers).toHaveBeenCalledWith(
      expect.objectContaining({ roles: ['satgas'], page: 1, limit: 10 }),
      expect.objectContaining({ enabled: true })
    );
  });

  it('fetches NOTHING while disabled', () => {
    // A form can keep this on screen (disabled) so the layout does not jump as a
    // role is chosen — but an un-narrowed query here would pull the whole roster,
    // which is the exact cost the role step exists to avoid.
    setup({ disabled: true, roles: undefined });

    expect(useUsers).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
  });
});
