import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import VehicleSwitcher from '~/components/domain/VehicleSwitcher.vue';

const AppSelect = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    "<button data-select @click=\"$emit('update:modelValue', 'second')\">select</button>",
};

describe('VehicleSwitcher', () => {
  it('stays hidden while the garage has only one vehicle', () => {
    const wrapper = mount(VehicleSwitcher, {
      props: { label: 'Veículo', vehicles: [{ id: 'first', label: 'Carro' }] },
      global: { components: { AppSelect } },
    });

    expect(wrapper.find('[data-select]').exists()).toBe(false);
  });

  it('appears for multiple vehicles and propagates selection', async () => {
    const wrapper = mount(VehicleSwitcher, {
      props: {
        label: 'Veículo',
        modelValue: 'first',
        vehicles: [
          { id: 'first', label: 'Carro 1' },
          { id: 'second', label: 'Carro 2' },
        ],
      },
      global: { components: { AppSelect } },
    });

    await wrapper.get('[data-select]').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([['second']]);
  });
});
