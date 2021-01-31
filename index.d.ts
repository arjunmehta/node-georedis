import { RedisClient } from 'redis'
export type Point = {
  latitude: number
  longitude: number
}

export type GeoCallback<TReply> = (err: Error, reply: TReply) => void

export type NearbyOptions = {
  withCoordinates: boolean // Will provide coordinates with locations, default false
  withHashes: boolean // Will provide a 52bit Geohash Integer, default false
  withDistances: boolean // Will provide distance from query, default false
  order: 'ASC' | 'DESC' // or 'DESC' or true (same as 'ASC'), default false
  units: 'm' | 'km' | 'mi' | 'ft' // or 'km', 'mi', 'ft', default 'm'
  count: number // Number of results to return, default undefined
  accurate: boolean // Useful if in emulated mode and accuracy is important, default false
}

export type GeoRedis = {
  delete(callback?: (err: Error) => void): void
  removeLocations(
    locationNames: string[],
    callback?: GeoCallback<boolean>
  ): void
  addLocation(
    locationName: string,
    position: Point,
    callback?: GeoCallback<boolean>
  ): void
  nearby(
    locationName: string,
    radius: number,
    options?: Partial<NearbyOptions>,
    callback?: GeoCallback<string[]>
  ): void
}

export function initialize(client: RedisClient): GeoRedis
