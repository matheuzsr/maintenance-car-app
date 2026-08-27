import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import ExpenseForm from '~/components/domain/ExpenseForm.vue';

vi.stubGlobal('useI18n', () => ({
  t: (key: string) => key,
  locale: ref('pt-BR'),
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
    "<button :id=\"id\" type=\"button\" :disabled=\"disabled\" @click=\"$emit('update:modelValue', id === 'expense-record' ? 'record-1' : id.includes('category-1') ? 'LABOR' : 'PARTS')\" />",
};
const AppButton = {
  props: ['disabled'],
  template: '<button type="submit" :disabled="disabled"><slot /></button>',
};

describe('ExpenseForm', () => {
  it('sums item decimal strings and preserves the linked record', async () => {
    const wrapper = mount(ExpenseForm, {
      props: { submitLabel: 'Salvar' },
      global: { components: { AppInput, AppSelect, AppButton } },
    });
    await wrapper.get('#expense-description').setValue('Pastilhas');
    await wrapper.get('#expense-item-description-0').setValue('Pastilhas');
    await wrapper.get('#expense-item-amount-0').setValue('249,90');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'expenses.form.addLabor')
      ?.trigger('click');
    await wrapper.get('#expense-item-description-1').setValue('Mão de obra');
    await wrapper.get('#expense-item-amount-1').setValue('80');
    await wrapper.get('#expense-record').trigger('click');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      amount: '329.90',
      maintenanceRecordId: 'record-1',
      items: [
        { category: 'PARTS', description: 'Pastilhas', amount: '249.90' },
        { category: 'LABOR', description: 'Mão de obra', amount: '80' },
      ],
    });
    expect(wrapper.emitted('submit')?.[0]?.[0]).not.toHaveProperty('notes');
  });

  it('sends null when an existing expense is unlinked', async () => {
    const wrapper = mount(ExpenseForm, {
      props: {
        mode: 'edit',
        submitLabel: 'Salvar',
        expense: {
          id: 'expense-1',
          userId: 'user-1',
          vehicleId: 'vehicle-1',
          maintenanceRecordId: null,
          category: 'PARTS',
          description: 'Filtro',
          incurredAt: new Date().toISOString(),
          amount: '10.00',
          items: [
            {
              id: 'item-1',
              expenseId: 'expense-1',
              category: 'PARTS',
              description: 'Filtro',
              amount: '10.00',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      global: { components: { AppInput, AppSelect, AppButton } },
    });
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      maintenanceRecordId: null,
      notes: null,
    });
  });
});
