import { PrismaClient, CommodityCategory } from "@prisma/client";

const prisma = new PrismaClient();

const commodities = [
  { slug: "corn", name: "Corn", symbol: "CORN", category: CommodityCategory.GRAIN, defaultUnit: "USD / bushel", color: "#e4b83f", description: "U.S. corn price and production indicators.", featured: true, displayOrder: 1 },
  { slug: "soybeans", name: "Soybeans", symbol: "SOYB", category: CommodityCategory.OILSEED, defaultUnit: "USD / bushel", color: "#68a357", description: "Soybean market and production indicators.", featured: true, displayOrder: 2 },
  { slug: "wheat", name: "Wheat", symbol: "WHEAT", category: CommodityCategory.GRAIN, defaultUnit: "USD / bushel", color: "#d39553", description: "All-wheat price and production indicators.", featured: true, displayOrder: 3 },
  { slug: "sorghum", name: "Sorghum", symbol: "SORGH", category: CommodityCategory.GRAIN, defaultUnit: "USD / bushel", color: "#bb6951", description: "Sorghum price and production indicators.", featured: true, displayOrder: 4 },
  { slug: "barley", name: "Barley", symbol: "BARL", category: CommodityCategory.GRAIN, defaultUnit: "USD / bushel", color: "#8a9b63", description: "Barley price and production indicators.", featured: true, displayOrder: 5 }
  ,{ slug: "rice", name: "Rice", symbol: "RICE", category: CommodityCategory.GRAIN, defaultUnit: "USD / cwt", color: "#76a9a0", description: "Rice production indicators.", featured: false, displayOrder: 6 }
  ,{ slug: "cotton", name: "Cotton", symbol: "COTTON", category: CommodityCategory.FIBER, defaultUnit: "USD / pound", color: "#9b87b3", description: "Upland cotton production indicators.", featured: false, displayOrder: 7 }
  ,{ slug: "peanuts", name: "Peanuts", symbol: "PEANUT", category: CommodityCategory.OILSEED, defaultUnit: "USD / pound", color: "#b57945", description: "Peanut production indicators.", featured: false, displayOrder: 8 }
  ,{ slug: "tobacco", name: "Tobacco", symbol: "TOBACCO", category: CommodityCategory.SPECIALTY, defaultUnit: "USD / pound", color: "#7d6847", description: "Tobacco production indicators.", featured: false, displayOrder: 9 }
  ,{ slug: "sugarcane", name: "Sugarcane", symbol: "SUGARCANE", category: CommodityCategory.SPECIALTY, defaultUnit: "USD / ton", color: "#55a56b", description: "Sugarcane production indicators.", featured: false, displayOrder: 10 }
  ,{ slug: "cattle", name: "Cattle", symbol: "CATTLE", category: CommodityCategory.LIVESTOCK, defaultUnit: "USD / head", color: "#8b5e3c", description: "Cattle inventory indicators.", featured: false, displayOrder: 11 }
  ,{ slug: "hogs", name: "Hogs", symbol: "HOGS", category: CommodityCategory.LIVESTOCK, defaultUnit: "USD / head", color: "#c47773", description: "Hog inventory indicators.", featured: false, displayOrder: 12 }
  ,{ slug: "broilers", name: "Broiler Chickens", symbol: "BROILERS", category: CommodityCategory.LIVESTOCK, defaultUnit: "USD / head", color: "#d58c46", description: "Broiler chicken production indicators.", featured: false, displayOrder: 13 }
  ,{ slug: "milk", name: "Milk", symbol: "MILK", category: CommodityCategory.LIVESTOCK, defaultUnit: "USD / cwt", color: "#5e91bd", description: "Raw milk production indicators.", featured: false, displayOrder: 14 }
  ,{ slug: "eggs", name: "Eggs", symbol: "EGGS", category: CommodityCategory.LIVESTOCK, defaultUnit: "USD / dozen", color: "#d6b65f", description: "Raw egg production indicators.", featured: false, displayOrder: 15 }
  ,{ slug: "oats", name: "Oats", symbol: "OATS", category: CommodityCategory.GRAIN, defaultUnit: "USD / bushel", color: "#c5a35c", description: "USDA oats production indicators.", featured: false, displayOrder: 16 }
  ,{ slug: "rye", name: "Rye", symbol: "RYE", category: CommodityCategory.GRAIN, defaultUnit: "USD / bushel", color: "#9a8d52", description: "USDA rye production indicators.", featured: false, displayOrder: 17 }
  ,{ slug: "canola", name: "Canola", symbol: "CANOLA", category: CommodityCategory.OILSEED, defaultUnit: "USD / pound", color: "#d4b832", description: "USDA canola production indicators.", featured: false, displayOrder: 18 }
  ,{ slug: "sunflower", name: "Sunflower", symbol: "SUNFLOWER", category: CommodityCategory.OILSEED, defaultUnit: "USD / pound", color: "#d69e2e", description: "USDA sunflower production indicators.", featured: false, displayOrder: 19 }
  ,{ slug: "dry-beans", name: "Dry Edible Beans", symbol: "DRYBEANS", category: CommodityCategory.SPECIALTY, defaultUnit: "USD / cwt", color: "#996b4a", description: "USDA dry edible bean production indicators.", featured: false, displayOrder: 20 }
  ,{ slug: "potatoes", name: "Potatoes", symbol: "POTATOES", category: CommodityCategory.SPECIALTY, defaultUnit: "USD / cwt", color: "#a98258", description: "USDA potato production indicators.", featured: false, displayOrder: 21 }
  ,{ slug: "sugarbeets", name: "Sugar Beets", symbol: "SUGARBEETS", category: CommodityCategory.SPECIALTY, defaultUnit: "USD / ton", color: "#b35f78", description: "USDA sugar beet production indicators.", featured: false, displayOrder: 22 }
  ,{ slug: "hay", name: "Hay", symbol: "HAY", category: CommodityCategory.SPECIALTY, defaultUnit: "USD / ton", color: "#7fa15a", description: "USDA hay production indicators.", featured: false, displayOrder: 23 }
  ,{ slug: "proso-millet", name: "Proso Millet", symbol: "MILLET", category: CommodityCategory.GRAIN, defaultUnit: "USD / bushel", color: "#b79b69", description: "USDA proso millet production indicators.", featured: false, displayOrder: 24 }
  ,{ slug: "flaxseed", name: "Flaxseed", symbol: "FLAXSEED", category: CommodityCategory.OILSEED, defaultUnit: "USD / bushel", color: "#6f86ad", description: "USDA flaxseed production indicators.", featured: false, displayOrder: 25 }
] as const;

const stateProfiles: Record<string, { top: string; scale: number }> = {
  AL: { top: "corn", scale: 120000000 },
  AK: { top: "barley", scale: 1200000 },
  AZ: { top: "wheat", scale: 18000000 },
  AR: { top: "rice", scale: 175000000 },
  CA: { top: "wheat", scale: 42000000 },
  CO: { top: "corn", scale: 155000000 },
  CT: { top: "corn", scale: 4500000 },
  DE: { top: "corn", scale: 31000000 },
  FL: { top: "corn", scale: 20000000 },
  GA: { top: "corn", scale: 68000000 },
  HI: { top: "corn", scale: 650000 },
  ID: { top: "barley", scale: 62000000 },
  IL: { top: "corn", scale: 2350000000 },
  IN: { top: "corn", scale: 1110000000 },
  IA: { top: "corn", scale: 2600000000 },
  KS: { top: "wheat", scale: 345000000 },
  KY: { top: "corn", scale: 265000000 },
  LA: { top: "sugarcane", scale: 88000000 },
  ME: { top: "barley", scale: 2800000 },
  MD: { top: "corn", scale: 72000000 },
  MA: { top: "corn", scale: 5500000 },
  MI: { top: "corn", scale: 360000000 },
  MN: { top: "corn", scale: 1480000000 },
  MS: { top: "cotton", scale: 130000000 },
  MO: { top: "cattle", scale: 285000000 },
  MT: { top: "wheat", scale: 215000000 },
  NE: { top: "corn", scale: 1820000000 },
  NV: { top: "barley", scale: 4500000 },
  NH: { top: "corn", scale: 2700000 },
  NJ: { top: "corn", scale: 10500000 },
  NM: { top: "sorghum", scale: 22000000 },
  NY: { top: "corn", scale: 95000000 },
  NC: { top: "tobacco", scale: 78000000 },
  ND: { top: "wheat", scale: 305000000 },
  OH: { top: "corn", scale: 680000000 },
  OK: { top: "wheat", scale: 118000000 },
  OR: { top: "wheat", scale: 48000000 },
  PA: { top: "corn", scale: 155000000 },
  RI: { top: "corn", scale: 900000 },
  SC: { top: "broilers", scale: 36000000 },
  SD: { top: "corn", scale: 890000000 },
  TN: { top: "cattle", scale: 95000000 },
  TX: { top: "sorghum", scale: 125000000 },
  UT: { top: "barley", scale: 18000000 },
  VT: { top: "corn", scale: 11000000 },
  VA: { top: "broilers", scale: 38000000 },
  WA: { top: "wheat", scale: 145000000 },
  WV: { top: "corn", scale: 13000000 },
  WI: { top: "corn", scale: 560000000 },
  WY: { top: "barley", scale: 8500000 },
};

const priceSeries: Record<string, number[]> = {
  corn: [4.31, 4.39, 4.35, 4.47, 4.42, 4.51],
  soybeans: [10.18, 10.32, 10.46, 10.38, 10.57, 10.63],
  wheat: [5.48, 5.61, 5.73, 5.65, 5.82, 5.91],
  sorghum: [4.08, 4.14, 4.20, 4.17, 4.29, 4.34],
  barley: [5.02, 5.11, 5.18, 5.15, 5.26, 5.33]
};

const cropOrder = ["corn", "soybeans", "wheat", "sorghum", "barley"] as const;

type ProductionSeed = { slug: string; value: number; unit: string; yieldValue?: number };

const stateMixOverrides: Record<string, ProductionSeed[]> = {
  AR: [
    { slug: "rice", value: 107_000_000, unit: "cwt" },
    { slug: "soybeans", value: 94_000_000, unit: "bushels", yieldValue: 52 },
    { slug: "broilers", value: 1_080_000_000, unit: "head" },
    { slug: "cattle", value: 1_620_000, unit: "head" },
    { slug: "eggs", value: 3_200_000_000, unit: "eggs" }
  ],
  LA: [
    { slug: "sugarcane", value: 14_000_000, unit: "tons" },
    { slug: "rice", value: 27_000_000, unit: "cwt" },
    { slug: "soybeans", value: 38_000_000, unit: "bushels", yieldValue: 48 },
    { slug: "cattle", value: 720_000, unit: "head" },
    { slug: "milk", value: 310_000_000, unit: "pounds" }
  ],
  MS: [
    { slug: "cotton", value: 1_050_000, unit: "bales" },
    { slug: "soybeans", value: 115_000_000, unit: "bushels", yieldValue: 54 },
    { slug: "broilers", value: 760_000_000, unit: "head" },
    { slug: "cattle", value: 910_000, unit: "head" },
    { slug: "eggs", value: 1_480_000_000, unit: "eggs" }
  ],
  MO: [
    { slug: "cattle", value: 4_050_000, unit: "head" },
    { slug: "hogs", value: 3_550_000, unit: "head" },
    { slug: "soybeans", value: 285_000_000, unit: "bushels", yieldValue: 51 },
    { slug: "corn", value: 560_000_000, unit: "bushels", yieldValue: 175 },
    { slug: "milk", value: 1_650_000_000, unit: "pounds" }
  ],
  NC: [
    { slug: "tobacco", value: 250_000_000, unit: "pounds" },
    { slug: "hogs", value: 8_100_000, unit: "head" },
    { slug: "broilers", value: 960_000_000, unit: "head" },
    { slug: "soybeans", value: 70_000_000, unit: "bushels", yieldValue: 40 },
    { slug: "milk", value: 980_000_000, unit: "pounds" }
  ],
  SC: [
    { slug: "broilers", value: 245_000_000, unit: "head" },
    { slug: "cotton", value: 370_000, unit: "bales" },
    { slug: "peanuts", value: 390_000_000, unit: "pounds" },
    { slug: "soybeans", value: 31_000_000, unit: "bushels", yieldValue: 39 },
    { slug: "cattle", value: 320_000, unit: "head" }
  ],
  TN: [
    { slug: "cattle", value: 1_730_000, unit: "head" },
    { slug: "cotton", value: 700_000, unit: "bales" },
    { slug: "soybeans", value: 82_000_000, unit: "bushels", yieldValue: 50 },
    { slug: "broilers", value: 190_000_000, unit: "head" },
    { slug: "milk", value: 720_000_000, unit: "pounds" }
  ],
  VA: [
    { slug: "broilers", value: 290_000_000, unit: "head" },
    { slug: "cattle", value: 1_390_000, unit: "head" },
    { slug: "milk", value: 1_520_000_000, unit: "pounds" },
    { slug: "tobacco", value: 34_000_000, unit: "pounds" },
    { slug: "soybeans", value: 27_000_000, unit: "bushels", yieldValue: 43 }
  ]
};

type CropSlug = (typeof cropOrder)[number];

const topWeights: Record<CropSlug, Record<CropSlug, number>> = {
  corn: { corn: 1, soybeans: 0.55, wheat: 0.12, sorghum: 0.08, barley: 0.035 },
  soybeans: { corn: 0.82, soybeans: 1, wheat: 0.10, sorghum: 0.07, barley: 0.03 },
  wheat: { corn: 0.24, soybeans: 0.16, wheat: 1, sorghum: 0.32, barley: 0.22 },
  sorghum: { corn: 0.58, soybeans: 0.28, wheat: 0.52, sorghum: 1, barley: 0.08 },
  barley: { corn: 0.22, soybeans: 0.10, wheat: 0.72, sorghum: 0.06, barley: 1 }
};

function monthStarts(count: number): Date[] {
  const now = new Date();
  const dates: Date[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    dates.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1)));
  }
  return dates;
}

function stateVariation(stateCode: string, crop: string): number {
  const score = [...`${stateCode}-${crop}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return 0.88 + (score % 25) / 100;
}

async function main(): Promise<void> {
  const commodityBySlug = new Map<string, string>();
  for (const item of commodities) {
    const commodity = await prisma.commodity.upsert({
      where: { slug: item.slug },
      create: item,
      update: item
    });
    commodityBySlug.set(item.slug, commodity.id);
  }

  const dates = monthStarts(6);
  for (const [slug, values] of Object.entries(priceSeries)) {
    const commodityId = commodityBySlug.get(slug);
    if (!commodityId) continue;
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (value === undefined) continue;
      const previousValue = index > 0 ? values[index - 1] ?? null : null;
      const changePercent = previousValue ? ((value - previousValue) / previousValue) * 100 : null;
      await prisma.commodityPrice.upsert({
        where: {
          commodityId_stateCode_priceDate_source: {
            commodityId,
            stateCode: "US",
            priceDate: dates[index]!,
            source: "Demo market feed"
          }
        },
        create: {
          commodityId,
          stateCode: "US",
          value,
          previousValue,
          changePercent,
          unit: "USD / bushel",
          priceDate: dates[index]!,
          source: "Demo market feed"
        },
        update: { value, previousValue, changePercent, unit: "USD / bushel" }
      });
    }
  }

  const productionYear = new Date().getUTCFullYear() - 1;
  for (const [stateCode, profile] of Object.entries(stateProfiles)) {
    const override = stateMixOverrides[stateCode];
    if (override) {
      for (const item of override) {
        const commodityId = commodityBySlug.get(item.slug);
        if (!commodityId) continue;
        const harvestedAcres = item.yieldValue ? Math.round(item.value / item.yieldValue) : null;
        await prisma.productionRecord.upsert({
          where: { commodityId_stateCode_year_source: { commodityId, stateCode, year: productionYear, source: "Demo production seed" } },
          create: { commodityId, stateCode, year: productionYear, value: item.value, unit: item.unit, harvestedAcres, yieldValue: item.yieldValue, source: "Demo production seed" },
          update: { value: item.value, unit: item.unit, harvestedAcres, yieldValue: item.yieldValue }
        });
      }
      continue;
    }
    const weights = topWeights[profile.top as CropSlug];
    for (const slug of cropOrder) {
      const commodityId = commodityBySlug.get(slug);
      if (!commodityId) continue;
      const value = Math.max(100_000, Math.round(profile.scale * weights[slug] * stateVariation(stateCode, slug)));
      const assumedYield = slug === "corn" ? 180 : slug === "soybeans" ? 55 : slug === "wheat" ? 48 : slug === "sorghum" ? 70 : 76;
      const harvestedAcres = Math.round(value / assumedYield);
      await prisma.productionRecord.upsert({
        where: {
          commodityId_stateCode_year_source: {
            commodityId,
            stateCode,
            year: productionYear,
            source: "Demo production seed"
          }
        },
        create: {
          commodityId,
          stateCode,
          year: productionYear,
          value,
          unit: "bushels",
          harvestedAcres,
          yieldValue: assumedYield,
          source: "Demo production seed"
        },
        update: { value, unit: "bushels", harvestedAcres, yieldValue: assumedYield }
      });
    }
  }

  console.log(`AgriPulse seeded ${commodities.length} commodities and ${Object.keys(stateProfiles).length} states.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
