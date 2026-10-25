export type Cat = {
  key: string; label: string; emoji: string; color: string
  /** extra words that should match this activity in the search box */
  keywords?: string
  /** Photon queries: a search word plus an OSM tag filter ("" = no tag filter, used for custom searches) */
  queries: { q: string; tag: string }[]
}

const c = (key: string, label: string, emoji: string, color: string, queries: [string, string][], keywords = ''): Cat =>
  ({ key, label, emoji, color, keywords, queries: queries.map(([q, tag]) => ({ q, tag })) })

const FOOD = '#ff9f0a', FUN = '#ff375f', OUT = '#30d158', SPORT = '#0a84ff', CULT = '#bf5af2', SHOP = '#40c8e0', WORK = '#64748b'

export const CENTRE_KEY = 'centre'

export const CATS: Cat[] = [
  c('restaurants', 'Restaurants', '🍽️', FOOD, [['restaurant', 'amenity:restaurant']], 'dinner lunch food eat biryani pizza'),
  c('cafes', 'Cafés', '☕', '#a2845e', [['cafe', 'amenity:cafe']], 'coffee tea chai'),
  c('movies', 'Movies', '🎬', FUN, [['cinema', 'amenity:cinema']], 'film cinema theatre multiplex'),
  c('parks', 'Parks & gardens', '🌳', OUT, [['park', 'leisure:park'], ['garden', 'leisure:garden']], 'walk stroll green picnic'),
  c('lakes', 'Lakes', '🏞️', '#0ea5a4', [['lake', 'water:lake'], ['lake', 'natural:water']], 'water walk boating waterfront'),
  c('bars', 'Bars & pubs', '🍸', '#5e5ce6', [['bar', 'amenity:bar'], ['pub', 'amenity:pub']], 'drinks beer brewery cocktails'),
  c('desserts', 'Desserts & bakeries', '🍨', '#ff6482', [['ice cream', 'amenity:ice_cream'], ['bakery', 'shop:bakery'], ['dessert', 'shop:pastry']], 'ice cream cake sweet'),
  c('fastfood', 'Fast food', '🍔', FOOD, [['fast food', 'amenity:fast_food']], 'burger quick snack'),
  c('fun', 'Bowling & arcade', '🎳', '#bf5af2', [['bowling', 'leisure:bowling_alley'], ['arcade', 'leisure:amusement_arcade']], 'games fun'),
  c('play', 'Parks & adventure', '🎢', FUN, [['amusement park', 'tourism:theme_park'], ['water park', 'leisure:water_park'], ['escape room', 'leisure:escape_game'], ['trampoline', 'leisure:trampoline_park']], 'theme park water park escape room rides'),
  c('zoo', 'Zoo & aquarium', '🦁', OUT, [['zoo', 'tourism:zoo'], ['aquarium', 'tourism:aquarium']], 'animals kids'),
  c('nightclubs', 'Nightlife', '🪩', '#7c3aed', [['nightclub', 'amenity:nightclub']], 'club dance party dj'),
  c('theatre', 'Theatre & shows', '🎭', CULT, [['theatre', 'amenity:theatre'], ['arts centre', 'amenity:arts_centre']], 'drama music live concert comedy'),
  c('views', 'Viewpoints', '🌄', OUT, [['viewpoint', 'tourism:viewpoint']], 'sunset scenic view'),
  c('nature', 'Nature reserves', '🥾', OUT, [['nature reserve', 'leisure:nature_reserve']], 'trek hike trail forest'),
  c('beach', 'Beaches', '🏖️', '#f59e0b', [['beach', 'natural:beach']], 'sea sand'),
  c('playground', 'Playgrounds', '🛝', OUT, [['playground', 'leisure:playground']], 'kids children family'),
  c('sports', 'Sports', '🏸', SPORT, [['sports centre', 'leisure:sports_centre'], ['stadium', 'leisure:stadium']], 'badminton cricket football turf court'),
  c('gyms', 'Gyms', '🏋️', SPORT, [['gym', 'leisure:fitness_centre']], 'workout fitness yoga'),
  c('swim', 'Swimming', '🏊', SPORT, [['swimming pool', 'leisure:swimming_pool']], 'pool'),
  c('golf', 'Golf', '⛳', SPORT, [['golf', 'leisure:golf_course'], ['mini golf', 'leisure:miniature_golf']], ''),
  c('spa', 'Spas & massage', '💆', '#ec4899', [['massage', 'shop:massage'], ['spa', 'leisure:spa']], 'relax wellness'),
  c('museums', 'Museums', '🏛️', CULT, [['museum', 'tourism:museum']], 'history science'),
  c('galleries', 'Art galleries', '🖼️', CULT, [['gallery', 'tourism:gallery']], 'art exhibition'),
  c('temples', 'Temples & worship', '🛕', '#f97316', [['temple', 'amenity:place_of_worship']], 'church mosque gurudwara spiritual'),
  c('historic', 'Historic sites', '🏰', '#a16207', [['fort', 'historic:fort'], ['monument', 'historic:monument'], ['castle', 'historic:castle']], 'heritage palace fort'),
  c('malls', 'Malls', '🛍️', SHOP, [['mall', 'shop:mall'], ['department store', 'shop:department_store']], 'shopping'),
  c('markets', 'Markets', '🧺', SHOP, [['market', 'amenity:marketplace']], 'bazaar street shopping vegetables'),
  c('books', 'Books & libraries', '📚', SHOP, [['bookstore', 'shop:books'], ['library', 'amenity:library']], 'reading study'),
  c('cowork', 'Co-working', '💻', WORK, [['coworking', 'office:coworking'], ['coworking space', 'amenity:coworking_space']], 'work office meeting laptop'),
  c('hotels', 'Hotels', '🏨', WORK, [['hotel', 'tourism:hotel']], 'stay lounge conference'),
]

export const customCat = (text: string): Cat => c(`custom:${text.toLowerCase()}`, text, '🔎', '#0a84ff', [[text, '']])

/** Not an activity: shows the exact centre coordinates instead of searching for places. */
export const CENTRE_CAT: Cat = c(CENTRE_KEY, 'Just the centre point', '📍', '#0a84ff', [])
