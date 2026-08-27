import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MaintenanceRecordForm from '~/components/domain/MaintenanceRecordForm.vue';

vi.stubGlobal('useI18n', () => ({
  t: (key: string) => key,
  n: (value: number) => String(value),
  locale: { value: 'pt-BR' },
}));
const AppInput = {
  props: ['id', 'modelValue', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<input :id="id" :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};
const AppSelect = {
  props: ['id', 'modelValue', 'disabled'],
  emits: ['update:modelValue'],
  template:
    '<button :id="id" type="button" :disabled="disabled" @click="$emit(\'update:modelValue\', id.includes(\'category\') ? \'PARTS\' : \'plan-1\')" />',
};
const AppButton = {
  props: ['disabled'],
  template: '<button type="submit" :disabled="disabled"><slot /></button>',
};
const vehicle = {
  id: 'vehicle-1',
  userId: 'user-1',
  nickname: 'Civic',
  brand: 'Honda',
  model: 'Civic',
  year: 2020,
  licensePlate: null,
  currentOdometerKm: 50000,
  currentOdometerRecordedAt: '2026-08-10T12:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-08-10T12:00:00.000Z',
};
const mountForm = () =>
  mount(MaintenanceRecordForm, {
    props: { mode: 'standalone', vehicle, submitLabel: 'Salvar' },
    global: { components: { AppInput, AppSelect, AppButton } },
  });

describe('MaintenanceRecordForm', () => {
  it('requires explicit acknowledgement for a lower odometer', async () => {
    const wrapper = mountForm();
    await wrapper.get('#record-description').setValue('Revisão anterior');
    await wrapper.get('#record-odometer').setValue('49000');
    await wrapper.get('#record-cost-item-description-0').setValue('Filtro');
    await wrapper.get('#record-cost-item-amount-0').setValue('10,50');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'maintenance.records.stale.confirmRequired',
    );
    await wrapper.get('.stale-warning input[type="checkbox"]').setValue(true);
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      description: 'Revisão anterior',
      odometerKm: 49000,
      totalCost: '10.50',
      costItems: [
        { category: 'PARTS', description: 'Filtro', amount: '10.50' },
      ],
    });
  });

  it('adds labor and calculates the total from cost items', async () => {
    const wrapper = mountForm();
    await wrapper.get('#record-description').setValue('Troca de pastilhas');
    await wrapper.get('#record-cost-item-description-0').setValue('Pastilhas');
    await wrapper.get('#record-cost-item-amount-0').setValue('249,90');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'maintenance.records.form.addLabor')
      ?.trigger('click');
    await wrapper
      .get('#record-cost-item-description-1')
      .setValue('Mão de obra');
    await wrapper.get('#record-cost-item-amount-1').setValue('80');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      description: 'Troca de pastilhas',
      totalCost: '329.90',
      costItems: [
        { category: 'PARTS', description: 'Pastilhas', amount: '249.90' },
        { category: 'LABOR', description: 'Mão de obra', amount: '80' },
      ],
    });
  });

  it('disables every write control while offline', () => {
    const wrapper = mount(MaintenanceRecordForm, {
      props: {
        mode: 'standalone',
        vehicle,
        submitLabel: 'Salvar',
        disabled: true,
      },
      global: { components: { AppInput, AppSelect, AppButton } },
    });
    expect(
      wrapper.get('#record-performed-at').attributes('disabled'),
    ).toBeDefined();
    expect(
      wrapper.get('button[type="submit"]').attributes('disabled'),
    ).toBeDefined();
  });
});
