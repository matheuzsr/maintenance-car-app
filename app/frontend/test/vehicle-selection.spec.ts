import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useVehicleSelectionStore } from '~/stores/vehicle-selection';

describe('vehicle selection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('prefers a valid route selection and persists it', () => {
    const store = useVehicleSelectionStore();
    store.initialize();
    store.reconcile(['first', 'second'], 'second');

    expect(store.selectedId).toBe('second');
    expect(localStorage.getItem('garage-em-dia:selected-vehicle')).toBe(
      'second',
    );
  });

  it('falls back when the persisted vehicle is no longer available', () => {
    localStorage.setItem('garage-em-dia:selected-vehicle', 'removed');
    const store = useVehicleSelectionStore();
    store.initialize();
    store.reconcile(['available']);

    expect(store.selectedId).toBe('available');
  });
});
