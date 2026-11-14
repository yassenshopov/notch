import type { CarTrip } from "./car-mock"

export type CarRouteGeometry = {
  tripId: string
  from: [number, number]
  to: [number, number]
  /** [lat, lng] */
  path: [number, number][]
}

/** Mock routes in Sofia — keyed to `CAR_MOCK_SNAPSHOT.tripHistory` ids */
export const CAR_SOFIA_ROUTES: CarRouteGeometry[] = [
  {
    tripId: "trip-1",
    from: [42.6758, 23.3189],
    to: [42.6978, 23.3075],
    path: [
      [42.6758, 23.3189],
      [42.6795, 23.312],
      [42.6862, 23.308],
      [42.6925, 23.306],
      [42.6978, 23.3075],
    ],
  },
  {
    tripId: "trip-2",
    from: [42.6758, 23.3189],
    to: [42.6952, 23.4062],
    path: [
      [42.6758, 23.3189],
      [42.682, 23.335],
      [42.69, 23.355],
      [42.694, 23.385],
      [42.6952, 23.4062],
    ],
  },
  {
    tripId: "trip-3",
    from: [42.6758, 23.3189],
    to: [42.6038, 23.4562],
    path: [
      [42.6758, 23.3189],
      [42.668, 23.342],
      [42.652, 23.368],
      [42.63, 23.4],
      [42.6038, 23.4562],
    ],
  },
]

export const CAR_SOFIA_HOME: [number, number] = [42.6758, 23.3189]

export const CAR_SOFIA_MAP_CENTER: [number, number] = [42.672, 23.34]

export function routesForTrips(trips: CarTrip[]): CarRouteGeometry[] {
  const ids = new Set(trips.map((t) => t.id))
  return CAR_SOFIA_ROUTES.filter((r) => ids.has(r.tripId))
}