export interface StateMetadata {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const stateMetadata: Record<string, StateMetadata> = {
  AL: { code: "AL", name: "Alabama", latitude: 32.8067, longitude: -86.7911 },
  AK: { code: "AK", name: "Alaska", latitude: 61.3707, longitude: -152.4044 },
  AZ: { code: "AZ", name: "Arizona", latitude: 33.7298, longitude: -111.4312 },
  AR: { code: "AR", name: "Arkansas", latitude: 34.9697, longitude: -92.3731 },
  CA: { code: "CA", name: "California", latitude: 36.1162, longitude: -119.6816 },
  CO: { code: "CO", name: "Colorado", latitude: 39.0598, longitude: -105.3111 },
  CT: { code: "CT", name: "Connecticut", latitude: 41.5978, longitude: -72.7554 },
  DE: { code: "DE", name: "Delaware", latitude: 39.3185, longitude: -75.5071 },
  FL: { code: "FL", name: "Florida", latitude: 27.7663, longitude: -81.6868 },
  GA: { code: "GA", name: "Georgia", latitude: 33.0406, longitude: -83.6431 },
  HI: { code: "HI", name: "Hawaii", latitude: 21.0943, longitude: -157.4983 },
  ID: { code: "ID", name: "Idaho", latitude: 44.2405, longitude: -114.4788 },
  IL: { code: "IL", name: "Illinois", latitude: 40.3495, longitude: -88.9861 },
  IN: { code: "IN", name: "Indiana", latitude: 39.8494, longitude: -86.2583 },
  IA: { code: "IA", name: "Iowa", latitude: 42.0115, longitude: -93.2105 },
  KS: { code: "KS", name: "Kansas", latitude: 38.5266, longitude: -96.7265 },
  KY: { code: "KY", name: "Kentucky", latitude: 37.6681, longitude: -84.6701 },
  LA: { code: "LA", name: "Louisiana", latitude: 31.1695, longitude: -91.8678 },
  ME: { code: "ME", name: "Maine", latitude: 44.6939, longitude: -69.3819 },
  MD: { code: "MD", name: "Maryland", latitude: 39.0639, longitude: -76.8021 },
  MA: { code: "MA", name: "Massachusetts", latitude: 42.2302, longitude: -71.5301 },
  MI: { code: "MI", name: "Michigan", latitude: 43.3266, longitude: -84.5361 },
  MN: { code: "MN", name: "Minnesota", latitude: 45.6945, longitude: -93.9002 },
  MS: { code: "MS", name: "Mississippi", latitude: 32.7416, longitude: -89.6787 },
  MO: { code: "MO", name: "Missouri", latitude: 38.4561, longitude: -92.2884 },
  MT: { code: "MT", name: "Montana", latitude: 46.9219, longitude: -110.4544 },
  NE: { code: "NE", name: "Nebraska", latitude: 41.1254, longitude: -98.2681 },
  NV: { code: "NV", name: "Nevada", latitude: 38.3135, longitude: -117.0554 },
  NH: { code: "NH", name: "New Hampshire", latitude: 43.4525, longitude: -71.5639 },
  NJ: { code: "NJ", name: "New Jersey", latitude: 40.2989, longitude: -74.5210 },
  NM: { code: "NM", name: "New Mexico", latitude: 34.8405, longitude: -106.2485 },
  NY: { code: "NY", name: "New York", latitude: 42.1657, longitude: -74.9481 },
  NC: { code: "NC", name: "North Carolina", latitude: 35.6301, longitude: -79.8064 },
  ND: { code: "ND", name: "North Dakota", latitude: 47.5289, longitude: -99.7840 },
  OH: { code: "OH", name: "Ohio", latitude: 40.3888, longitude: -82.7649 },
  OK: { code: "OK", name: "Oklahoma", latitude: 35.5653, longitude: -96.9289 },
  OR: { code: "OR", name: "Oregon", latitude: 44.5720, longitude: -122.0709 },
  PA: { code: "PA", name: "Pennsylvania", latitude: 40.5908, longitude: -77.2098 },
  RI: { code: "RI", name: "Rhode Island", latitude: 41.6809, longitude: -71.5118 },
  SC: { code: "SC", name: "South Carolina", latitude: 33.8569, longitude: -80.9450 },
  SD: { code: "SD", name: "South Dakota", latitude: 44.2998, longitude: -99.4388 },
  TN: { code: "TN", name: "Tennessee", latitude: 35.7478, longitude: -86.6923 },
  TX: { code: "TX", name: "Texas", latitude: 31.0545, longitude: -97.5635 },
  UT: { code: "UT", name: "Utah", latitude: 40.1500, longitude: -111.8624 },
  VT: { code: "VT", name: "Vermont", latitude: 44.0459, longitude: -72.7107 },
  VA: { code: "VA", name: "Virginia", latitude: 37.7693, longitude: -78.1700 },
  WA: { code: "WA", name: "Washington", latitude: 47.4009, longitude: -121.4905 },
  WV: { code: "WV", name: "West Virginia", latitude: 38.4912, longitude: -80.9545 },
  WI: { code: "WI", name: "Wisconsin", latitude: 44.2685, longitude: -89.6165 },
  WY: { code: "WY", name: "Wyoming", latitude: 42.7560, longitude: -107.3025 }
};

export const validStateCodes = new Set(Object.keys(stateMetadata));
