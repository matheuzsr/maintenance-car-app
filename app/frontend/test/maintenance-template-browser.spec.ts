import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MaintenanceTemplateBrowser from '~/components/domain/MaintenanceTemplateBrowser.vue';

vi.stubGlobal('useI18n', () => ({
  t: (key: string) => key,
  n: (value: number) => String(value),
}));
const AppInput = { template: '<div />' };
const AppSelect = { template: '<div />' };
const AppEmptyState = { template: '<div />' };

describe('MaintenanceTemplateBrowser', () => {
  it('emits the selected template', async () => {
    const template = {
      id: 'one',
      slug: 'oil',
      name: 'Troca de óleo',
      category: 'ENGINE',
      active: true,
      createdAt: '',
      updatedAt: '',
    } as never;
    const wrapper = mount(MaintenanceTemplateBrowser, {
      props: { templates: [template] },
      global: { components: { AppInput, AppSelect, AppEmptyState } },
    });
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('select')?.[0]?.[0]).toEqual(template);
  });
});
