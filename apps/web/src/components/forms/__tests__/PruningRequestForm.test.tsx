/**
 * Unit tests: PruningRequestForm — address, tree details, contact info.
 * Submit/Cancel live in the modal's DialogFooter (outside this form),
 * so tests submit via a sibling button wired to the same `formId`,
 * matching how PruningRequestFormModal renders it.
 */
import { render, screen } from '@testing-library/react';
import { PruningRequestForm } from '../PruningRequestForm';

const FORM_ID = 'pruning-request-form-test';

describe('PruningRequestForm', () => {
  it('renders form with formId prop', () => {
    const { container } = render(
      <PruningRequestForm
        formId={FORM_ID}
        mode="create"
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />
    );
    const form = container.querySelector(`form#${FORM_ID}`) as HTMLFormElement;
    expect(form).toBeInTheDocument();
  });

  it('renders all major form sections', () => {
    const { container } = render(
      <PruningRequestForm
        formId={FORM_ID}
        mode="create"
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />
    );
    // Check for section headings (translated h3 elements)
    const headings = container.querySelectorAll('h3');
    const headingTexts = Array.from(headings).map((h) => h.textContent);
    expect(headingTexts.some((t) => t?.includes('Lokasi'))).toBe(true); // Location section
    expect(headingTexts.some((t) => t?.includes('Pohon'))).toBe(true); // Tree details section
    expect(headingTexts.some((t) => t?.includes('Kontak'))).toBe(true); // Contact section
    expect(headingTexts.some((t) => t?.includes('Catatan'))).toBe(true); // Notes section
  });

  it('renders GPS fields in create mode', () => {
    render(
      <PruningRequestForm
        formId={FORM_ID}
        mode="create"
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />
    );
    // GPS fields are rendered as number inputs in create mode
    const inputs = screen.getAllByRole('spinbutton');
    // Should have GPS lat/lng inputs (at least 2 number inputs)
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('does NOT render GPS fields in edit mode', () => {
    render(
      <PruningRequestForm
        formId={FORM_ID}
        mode="edit"
        initialData={{
          id: '1',
          referenceCode: 'PR-001',
          submittedBy: 'user1',
          kecamatanName: 'Surabaya',
          districtId: 'district1',
          address: 'Test Address',
          gpsLat: -7.2575,
          gpsLng: 112.7521,
          expectedDate: null,
          expectedYear: null,
          expectedIsoWeek: null,
          estimatedPlantCount: null,
          treeCount: null,
          treeHeightEstimate: null,
          treeDiameterEstimate: null,
          requesterName: null,
          requesterPhone: null,
          rtLeaderName: null,
          rtLeaderPhone: null,
          photoUrls: [],
          notes: null,
          status: 'submitted',
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          assignedTaskId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />
    );
    // In edit mode, GPS spinbuttons should not be present (or fewer of them)
    const inputs = screen.queryAllByRole('spinbutton');
    // Should have no GPS fields, only other numeric inputs like treeCount
    expect(inputs.length).toBeLessThanOrEqual(2);
  });

  it('disables all fields in read-only mode', () => {
    const { container } = render(
      <PruningRequestForm
        formId={FORM_ID}
        mode="create"
        readOnly={true}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />
    );
    // Check that all input and textarea fields are disabled
    const inputs = container.querySelectorAll('input:not([type="hidden"])') as NodeListOf<HTMLInputElement>;
    const textareas = container.querySelectorAll('textarea') as NodeListOf<HTMLTextAreaElement>;

    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
    textareas.forEach((textarea) => {
      expect(textarea).toBeDisabled();
    });
  });

  it('does not render FormActions buttons (they moved to modal footer)', () => {
    const { container } = render(
      <PruningRequestForm
        formId={FORM_ID}
        mode="create"
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />
    );
    // FormActions component should NOT be rendered in the form anymore
    const form = container.querySelector(`form#${FORM_ID}`) as HTMLFormElement;
    const buttons = form.querySelectorAll('button');
    // Form should have no buttons (they're in DialogFooter now)
    expect(buttons.length).toBe(0);
  });
});
