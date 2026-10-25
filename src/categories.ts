export type Cat = {
  key: string; label: string; emoji: string; color: string
  /** search phrases sent to Nominatim */
  terms: string[]
  /** accepted OSM "category:type" pairs, so a search for "bar" doesn't return barbers */
  types: string[]
}

export const CATS: Cat[] = [
  { key: 'restaurants', label: 'Restaurants', emoji: '🍽️', color: '#ff9f0a', terms: ['restaurant'], types: ['amenity:restaurant'] },
  { key: 'cafes', label: 'Cafés', emoji: '☕', color: '#a2845e', terms: ['cafe'], types: ['amenity:cafe'] },
  { key: 'movies', label: 'Movies', emoji: '🎬', color: '#ff375f', terms: ['cinema'], types: ['amenity:cinema'] },
  { key: 'walks', label: 'Walks & parks', emoji: '🌳', color: '#30d158', terms: ['park', 'garden'], types: ['leisure:park', 'leisure:garden', 'leisure:nature_reserve'] },
  {
    key: 'fun', label: 'Fun & games', emoji: '🎳', color: '#bf5af2', terms: ['bowling', 'amusement', 'zoo'],
    types: ['leisure:bowling_alley', 'leisure:amusement_arcade', 'leisure:escape_game', 'leisure:miniature_golf', 'leisure:water_park', 'leisure:trampoline_park', 'tourism:theme_park', 'tourism:zoo', 'tourism:aquarium'],
  },
  { key: 'nightlife', label: 'Bars & nightlife', emoji: '🍸', color: '#5e5ce6', terms: ['bar', 'pub'], types: ['amenity:bar', 'amenity:pub', 'amenity:nightclub'] },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#40c8e0', terms: ['mall'], types: ['shop:mall', 'shop:department_store'] },
  { key: 'culture', label: 'Museums & art', emoji: '🖼️', color: '#ff6482', terms: ['museum', 'art gallery'], types: ['tourism:museum', 'tourism:gallery'] },
]
