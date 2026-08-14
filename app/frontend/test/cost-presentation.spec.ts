import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import CostBars from '~/components/domain/CostBars.vue';
import CostSummary from '~/components/domain/CostSummary.vue';

vi.stubGlobal('useI18n', () => ({
  t: (key: string) => key,
  locale: ref('pt-BR'),
}));
const summary = {
  serviceCost: '350.00',
  additionalExpenses: '125.50',
  linkedItemizedExpenses: '80.00',
  total: '475.50',
  expensesByCategory: [{ category: 'PARTS' as const, total: '205.50' }],
};

describe('cost report presentation', () => {
  it('shows linked items separately while the authoritative total excludes them', () => {
    const wrapper = mount(CostSummary, { props: { summary } });
    expect(wrapper.text()).toContain('R$ 475,50');
    expect(wrapper.text()).toContain('R$ 80,00');
    expect(wrapper.text()).toContain('reports.summary.noDoubleCount');
    expect(wrapper.findAll('dd').map((item) => item.text())).toEqual([
      'R$ 350,00',
      'R$ 125,50',
      'R$ 80,00',
    ]);
  });

  it('exposes every bucket period and exact value as an accessible list', () => {
    const wrapper = mount(CostBars, {
      props: {
        buckets: [
          { period: '2026-07', ...summary },
          { period: '2026-08', ...summary, total: '100.00' },
        ],
      },
    });
    expect(wrapper.get('ul').attributes('aria-label')).toBe(
      'reports.chart.summary',
    );
    expect(wrapper.findAll('li')).toHaveLength(2);
    expect(wrapper.text()).toContain('2026-07');
    expect(wrapper.text()).toContain('R$ 475,50');
  });
});
