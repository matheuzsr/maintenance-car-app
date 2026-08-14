import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MaintenancePlanForm from '~/components/domain/MaintenancePlanForm.vue';

vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }));
const AppInput = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input data-name :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};
const AppSelect = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<button type="button" data-category @click="$emit(\'update:modelValue\', \'ENGINE\')" />',
};
const AppButton = {
  props: ['disabled'],
  template: '<button type="submit" :disabled="disabled"><slot /></button>',
};

describe('MaintenancePlanForm', () => {
  it('disables its write controls while offline', () => {
    const wrapper = mount(MaintenancePlanForm, {
      props: { submitLabel: 'Salvar', disabled: true },
      global: { components: { AppInput, AppSelect, AppButton } },
    });
    expect(wrapper.get('#plan-km').attributes('disabled')).toBeDefined();
    expect(
      wrapper.get('button[type="submit"]').attributes('disabled'),
    ).toBeDefined();
  });
  it('rejects a plan without an interval', async () => {
    const wrapper = mount(MaintenancePlanForm, {
      props: { submitLabel: 'Salvar' },
      global: { components: { AppInput, AppSelect, AppButton } },
    });
    await wrapper.get('[data-name]').setValue('Óleo');
    await wrapper.get('[data-category]').trigger('click');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'maintenance.form.validation',
    );
  });

  it('emits normalized data for a valid custom plan', async () => {
    const wrapper = mount(MaintenancePlanForm, {
      props: { submitLabel: 'Salvar' },
      global: { components: { AppInput, AppSelect, AppButton } },
    });
    await wrapper.get('[data-name]').setValue('Óleo');
    await wrapper.get('[data-category]').trigger('click');
    await wrapper.get('#plan-km').setValue('10000');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'Óleo',
      category: 'ENGINE',
      intervalMonths: null,
      intervalKm: 10000,
    });
  });
});
