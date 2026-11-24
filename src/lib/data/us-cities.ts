/**
 * Estados de Estados Unidos con sus ciudades principales y las de logística
 * (cruces fronterizos, centros de distribución, puertos). No es el padrón
 * completo de localidades: si una ciudad no está, el formulario deja
 * escribirla a mano. Mismo formato que el catálogo de México.
 */
import type { StateCitiesGroup } from "@/lib/data/mexico-cities";

export const US_STATES_CITIES: StateCitiesGroup[] = [
  { value: "Alabama", items: ["Auburn", "Birmingham", "Decatur", "Dothan", "Florence", "Gadsden", "Hoover", "Huntsville", "Mobile", "Montgomery", "Opelika", "Tuscaloosa"] },
  { value: "Alaska", items: ["Anchorage", "Fairbanks", "Juneau", "Kenai", "Ketchikan", "Sitka", "Wasilla"] },
  { value: "Arizona", items: ["Casa Grande", "Chandler", "Douglas", "Flagstaff", "Gilbert", "Glendale", "Goodyear", "Kingman", "Lake Havasu City", "Mesa", "Nogales", "Peoria", "Phoenix", "San Luis", "Scottsdale", "Sierra Vista", "Tempe", "Tolleson", "Tucson", "Yuma"] },
  { value: "Arkansas", items: ["Bentonville", "Conway", "Fayetteville", "Fort Smith", "Jonesboro", "Little Rock", "Lowell", "North Little Rock", "Pine Bluff", "Rogers", "Springdale", "Texarkana", "West Memphis"] },
  { value: "California", items: ["Anaheim", "Bakersfield", "Calexico", "Carson", "Chino", "Chula Vista", "City of Industry", "Compton", "Corona", "El Centro", "Fontana", "Fresno", "Fullerton", "Hayward", "Irvine", "Long Beach", "Los Angeles", "Modesto", "Moreno Valley", "Oakland", "Ontario", "Otay Mesa", "Oxnard", "Perris", "Pomona", "Rancho Cucamonga", "Redlands", "Riverside", "Sacramento", "Salinas", "San Bernardino", "San Diego", "San Francisco", "San Jose", "San Leandro", "San Ysidro", "Santa Ana", "Santa Fe Springs", "Stockton", "Torrance", "Tracy", "Victorville", "Vernon", "Visalia"] },
  { value: "Colorado", items: ["Aurora", "Boulder", "Colorado Springs", "Commerce City", "Denver", "Fort Collins", "Grand Junction", "Greeley", "Lakewood", "Loveland", "Pueblo", "Thornton"] },
  { value: "Connecticut", items: ["Bridgeport", "Danbury", "Hartford", "New Britain", "New Haven", "Norwalk", "Stamford", "Waterbury"] },
  { value: "Delaware", items: ["Dover", "Middletown", "Newark", "New Castle", "Wilmington"] },
  { value: "District of Columbia", items: ["Washington"] },
  { value: "Florida", items: ["Boca Raton", "Doral", "Fort Lauderdale", "Fort Myers", "Gainesville", "Hialeah", "Jacksonville", "Lakeland", "Medley", "Miami", "Ocala", "Orlando", "Pensacola", "Plant City", "Pompano Beach", "Port Everglades", "Sarasota", "St. Petersburg", "Tallahassee", "Tampa", "West Palm Beach"] },
  { value: "Georgia", items: ["Albany", "Athens", "Atlanta", "Augusta", "Braselton", "Columbus", "Dalton", "Gainesville", "Macon", "McDonough", "Savannah", "Valdosta"] },
  { value: "Hawaii", items: ["Hilo", "Honolulu", "Kahului", "Kailua", "Pearl City"] },
  { value: "Idaho", items: ["Boise", "Caldwell", "Coeur d'Alene", "Idaho Falls", "Meridian", "Nampa", "Pocatello", "Twin Falls"] },
  { value: "Illinois", items: ["Aurora", "Bloomington", "Bolingbrook", "Champaign", "Chicago", "Elgin", "Elk Grove Village", "Joliet", "Naperville", "Peoria", "Rockford", "Springfield"] },
  { value: "Indiana", items: ["Bloomington", "Elkhart", "Evansville", "Fort Wayne", "Gary", "Indianapolis", "Lafayette", "Plainfield", "South Bend", "Whitestown"] },
  { value: "Iowa", items: ["Ames", "Cedar Rapids", "Council Bluffs", "Davenport", "Des Moines", "Dubuque", "Iowa City", "Sioux City", "Waterloo"] },
  { value: "Kansas", items: ["Edwardsville", "Garden City", "Kansas City", "Lawrence", "Lenexa", "Olathe", "Overland Park", "Salina", "Topeka", "Wichita"] },
  { value: "Kentucky", items: ["Bowling Green", "Covington", "Elizabethtown", "Florence", "Frankfort", "Hebron", "Lexington", "Louisville", "Owensboro", "Shepherdsville"] },
  { value: "Louisiana", items: ["Alexandria", "Baton Rouge", "Lafayette", "Lake Charles", "Monroe", "New Orleans", "Shreveport"] },
  { value: "Maine", items: ["Augusta", "Bangor", "Lewiston", "Portland", "South Portland"] },
  { value: "Maryland", items: ["Annapolis", "Baltimore", "Frederick", "Gaithersburg", "Hagerstown", "Rockville", "Salisbury"] },
  { value: "Massachusetts", items: ["Boston", "Brockton", "Cambridge", "Fall River", "Lowell", "New Bedford", "Springfield", "Worcester"] },
  { value: "Michigan", items: ["Ann Arbor", "Dearborn", "Detroit", "Flint", "Grand Rapids", "Kalamazoo", "Lansing", "Livonia", "Romulus", "Saginaw", "Sterling Heights", "Warren"] },
  { value: "Minnesota", items: ["Bloomington", "Duluth", "Eagan", "Minneapolis", "Rochester", "Saint Cloud", "Saint Paul", "Shakopee"] },
  { value: "Mississippi", items: ["Biloxi", "Gulfport", "Hattiesburg", "Jackson", "Meridian", "Olive Branch", "Southaven", "Tupelo"] },
  { value: "Missouri", items: ["Columbia", "Independence", "Jefferson City", "Joplin", "Kansas City", "Springfield", "St. Joseph", "St. Louis"] },
  { value: "Montana", items: ["Billings", "Bozeman", "Butte", "Great Falls", "Helena", "Missoula"] },
  { value: "Nebraska", items: ["Grand Island", "Kearney", "Lincoln", "North Platte", "Omaha"] },
  { value: "Nevada", items: ["Carson City", "Henderson", "Las Vegas", "North Las Vegas", "Reno", "Sparks"] },
  { value: "New Hampshire", items: ["Concord", "Manchester", "Nashua", "Portsmouth"] },
  { value: "New Jersey", items: ["Camden", "Cranbury", "Edison", "Elizabeth", "Jersey City", "Newark", "Paterson", "Secaucus", "Trenton"] },
  { value: "New Mexico", items: ["Albuquerque", "Columbus", "Farmington", "Las Cruces", "Roswell", "Santa Fe", "Santa Teresa"] },
  { value: "New York", items: ["Albany", "Brooklyn", "Buffalo", "Bronx", "New York", "Queens", "Rochester", "Staten Island", "Syracuse", "Yonkers"] },
  { value: "North Carolina", items: ["Asheville", "Charlotte", "Durham", "Fayetteville", "Greensboro", "Greenville", "High Point", "Raleigh", "Wilmington", "Winston-Salem"] },
  { value: "North Dakota", items: ["Bismarck", "Fargo", "Grand Forks", "Minot"] },
  { value: "Ohio", items: ["Akron", "Canton", "Cincinnati", "Cleveland", "Columbus", "Dayton", "Groveport", "Toledo", "West Chester", "Youngstown"] },
  { value: "Oklahoma", items: ["Broken Arrow", "Lawton", "Norman", "Oklahoma City", "Stillwater", "Tulsa"] },
  { value: "Oregon", items: ["Beaverton", "Bend", "Eugene", "Gresham", "Medford", "Portland", "Salem"] },
  { value: "Pennsylvania", items: ["Allentown", "Bethlehem", "Carlisle", "Erie", "Harrisburg", "Lancaster", "Philadelphia", "Pittsburgh", "Reading", "Scranton", "York"] },
  { value: "Rhode Island", items: ["Cranston", "Pawtucket", "Providence", "Warwick"] },
  { value: "South Carolina", items: ["Charleston", "Columbia", "Florence", "Greenville", "Myrtle Beach", "North Charleston", "Rock Hill", "Spartanburg"] },
  { value: "South Dakota", items: ["Aberdeen", "Rapid City", "Sioux Falls"] },
  { value: "Tennessee", items: ["Chattanooga", "Clarksville", "Jackson", "Knoxville", "La Vergne", "Lebanon", "Memphis", "Murfreesboro", "Nashville", "Smyrna"] },
  { value: "Texas", items: ["Abilene", "Amarillo", "Arlington", "Austin", "Baytown", "Beaumont", "Brownsville", "Carrollton", "College Station", "Corpus Christi", "Dallas", "Del Rio", "Denton", "Eagle Pass", "Edinburg", "El Paso", "Fort Worth", "Frisco", "Garland", "Grand Prairie", "Harlingen", "Hidalgo", "Houston", "Irving", "Katy", "Killeen", "Laredo", "Lewisville", "Longview", "Lubbock", "McAllen", "Mesquite", "Midland", "Mission", "Odessa", "Pasadena", "Pharr", "Plano", "Presidio", "Progreso", "Rio Grande City", "Roma", "San Antonio", "Tyler", "Victoria", "Waco", "Wichita Falls"] },
  { value: "Utah", items: ["Logan", "Ogden", "Orem", "Provo", "Salt Lake City", "St. George", "West Valley City"] },
  { value: "Vermont", items: ["Burlington", "Montpelier", "Rutland", "South Burlington"] },
  { value: "Virginia", items: ["Alexandria", "Chesapeake", "Norfolk", "Richmond", "Roanoke", "Suffolk", "Virginia Beach", "Winchester"] },
  { value: "Washington", items: ["Bellevue", "Everett", "Kent", "Seattle", "Spokane", "Tacoma", "Vancouver", "Yakima"] },
  { value: "West Virginia", items: ["Charleston", "Huntington", "Morgantown", "Parkersburg", "Wheeling"] },
  { value: "Wisconsin", items: ["Appleton", "Eau Claire", "Green Bay", "Kenosha", "La Crosse", "Madison", "Milwaukee", "Oshkosh", "Racine"] },
  { value: "Wyoming", items: ["Casper", "Cheyenne", "Gillette", "Laramie", "Rock Springs"] },
];

/** Ciudades del estado, para la lista filtrada. */
export function usCitiesOf(state: string): string[] {
  return US_STATES_CITIES.find((g) => g.value === state)?.items ?? [];
}

/** El estado de una ciudad del catálogo (el primero si se repite), o "". */
export function usStateOfCity(city: string): string {
  const c = city.trim().toLowerCase();
  return US_STATES_CITIES.find((g) => g.items.some((i) => i.toLowerCase() === c))?.value ?? "";
}
