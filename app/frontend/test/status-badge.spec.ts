import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import AppStatusBadge from '~/components/ui/AppStatusBadge.vue';

describe('AppStatusBadge', () => {
  it('presents the status using text and a semantic marker', () => {
    render(AppStatusBadge, {
      props: { label: 'Atrasada por data', status: 'danger' },
    });

    const status = screen.getByText('Atrasada por data');
    expect(status.classList.contains('status-badge--danger')).toBe(true);
    expect(status.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
