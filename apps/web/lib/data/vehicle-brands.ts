/**
 * A curated set of car/two-wheeler brands commonly serviced by Indian
 * workshops, each with a few of their most common models — NOT exhaustive
 * (dozens of brands sell hundreds of model/variant combinations; hardcoding
 * all of them accurately isn't reliable to maintain here). Powers the
 * Vehicle form's Brand → Model cascading selects; Model always has an
 * "Other" escape hatch to free text so a real, less-common model is never
 * blocked. Real per-brand logos are deliberately not used (see the
 * Estimates page's own "generic icon over trademarked logos" precedent) —
 * every brand shares one generic vehicle icon in the UI.
 */
export const VEHICLE_BRANDS: string[] = [
  'Maruti Suzuki',
  'Hyundai',
  'Tata',
  'Mahindra',
  'Honda',
  'Toyota',
  'Kia',
  'Volkswagen',
  'Skoda',
  'Renault',
  'Nissan',
  'Ford',
  'MG',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Volvo',
  'Jeep',
  'Citroen',
  'Jaguar',
  'Land Rover',
  'Hero',
  'Honda (Two-Wheeler)',
  'Bajaj',
  'TVS',
  'Royal Enfield',
  'Yamaha',
  'Suzuki (Two-Wheeler)',
  'KTM',
];

export const MODELS_BY_BRAND: Record<string, string[]> = {
  'Maruti Suzuki': ['Alto', 'WagonR', 'Swift', 'Baleno', 'Dzire', 'Ertiga', 'Brezza', 'Celerio', 'Eeco'],
  Hyundai: ['i10', 'i20', 'Venue', 'Creta', 'Verna', 'Aura', 'Exter', 'Alcazar'],
  Tata: ['Tiago', 'Tigor', 'Punch', 'Nexon', 'Altroz', 'Harrier', 'Safari'],
  Mahindra: ['Bolero', 'XUV300', 'XUV700', 'Scorpio', 'Thar', 'KUV100'],
  Honda: ['City', 'Amaze', 'Jazz', 'WR-V', 'Elevate'],
  Toyota: ['Innova', 'Fortuner', 'Glanza', 'Urban Cruiser', 'Camry'],
  Kia: ['Seltos', 'Sonet', 'Carens', 'Carnival'],
  Volkswagen: ['Polo', 'Vento', 'Taigun', 'Virtus'],
  Skoda: ['Rapid', 'Octavia', 'Kushaq', 'Slavia', 'Superb'],
  Renault: ['Kwid', 'Triber', 'Kiger'],
  Nissan: ['Magnite', 'Micra', 'Sunny'],
  Ford: ['EcoSport', 'Figo', 'Endeavour'],
  MG: ['Hector', 'Astor', 'ZS EV'],
  BMW: ['3 Series', '5 Series', 'X1', 'X3', 'X5', '7 Series'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'GLA', 'GLC', 'S-Class'],
  Audi: ['A4', 'A6', 'Q3', 'Q5', 'Q7'],
  Volvo: ['XC40', 'XC60', 'XC90', 'S90'],
  Jeep: ['Compass', 'Meridian'],
  Citroen: ['C3', 'C5 Aircross'],
  Jaguar: ['XF', 'F-Pace'],
  'Land Rover': ['Discovery Sport', 'Range Rover Evoque', 'Defender'],
  Hero: ['Splendor', 'HF Deluxe', 'Passion', 'Glamour', 'Xtreme'],
  'Honda (Two-Wheeler)': ['Activa', 'Shine', 'Unicorn', 'SP125'],
  Bajaj: ['Pulsar', 'Platina', 'Avenger', 'CT100'],
  TVS: ['Apache', 'Jupiter', 'Ntorq', 'Star City'],
  'Royal Enfield': ['Classic 350', 'Bullet', 'Himalayan', 'Meteor'],
  Yamaha: ['FZ', 'R15', 'MT-15', 'Fascino'],
  'Suzuki (Two-Wheeler)': ['Access', 'Gixxer', 'Burgman'],
  KTM: ['Duke 200', 'Duke 390', 'RC 200'],
};

export const FUEL_TYPES = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'cng', label: 'CNG' },
] as const;

export const TRANSMISSIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
] as const;

/** Common vehicle colours with a real swatch hex each — for the small color-dot shown next to the Colour select. "Other" has no swatch (falls back to free text). */
export const VEHICLE_COLOURS: { name: string; hex: string }[] = [
  { name: 'White', hex: '#f5f5f4' },
  { name: 'Black', hex: '#18181b' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Grey', hex: '#6b7280' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Brown', hex: '#78350f' },
  { name: 'Beige', hex: '#e8dcc8' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Orange', hex: '#ea580c' },
];

/** Common warranty arrangements — the underlying Vehicle.warrantyInfo column stays free text, this is just a faster-to-fill preset list with an "Other" escape hatch. */
export const WARRANTY_PRESETS: string[] = ['Manufacturer Warranty', 'Extended Warranty', 'Third-Party Warranty', 'No Warranty'];
