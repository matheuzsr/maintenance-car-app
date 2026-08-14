import { defineStore } from 'pinia';
import { ref } from 'vue';

const STORAGE_KEY = 'garage-em-dia:selected-vehicle';

export const useVehicleSelectionStore = defineStore('vehicle-selection', () => {
  const selectedId = ref<string>();

  function initialize(routeId?: string): void {
    const saved =
      typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    selectedId.value = routeId || saved || undefined;
  }

  function select(id?: string): void {
    selectedId.value = id;
    if (typeof window === 'undefined') return;
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }

  function reconcile(ids: string[], routeId?: string): void {
    const candidate = routeId || selectedId.value;
    select(candidate && ids.includes(candidate) ? candidate : ids[0]);
  }

  return { selectedId, initialize, reconcile, select };
});
