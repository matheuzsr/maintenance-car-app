import type { LocationQueryRaw } from 'vue-router';

export function vehicleSelectionTarget(
  path: string,
  query: LocationQueryRaw,
  routeVehicleId: string | undefined,
  selectedId: string,
): { path: string; query: LocationQueryRaw } {
  if (routeVehicleId) {
    const segments = path.split('/');
    const vehicleIndex = segments.indexOf('vehicles');
    if (vehicleIndex >= 0 && segments[vehicleIndex + 1] === routeVehicleId) {
      segments[vehicleIndex + 1] = selectedId;
      const { vehicle: _vehicle, ...remainingQuery } = query;
      return { path: segments.join('/'), query: remainingQuery };
    }
  }

  return { path, query: { ...query, vehicle: selectedId } };
}
