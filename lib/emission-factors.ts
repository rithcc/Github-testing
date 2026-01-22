// Carbon Emission Factors Database
// Sources: EPA, IPCC, various environmental agencies

export const emissionFactors = {
  electricity: {
    india: 0.82,      // kg CO2 per kWh
    usa: 0.42,
    uk: 0.23,
    eu: 0.28,
    china: 0.58,
    default: 0.5,
    unit: "kg CO2 per kWh"
  },

  fuel: {
    petrol: 2.31,     // kg CO2 per liter
    diesel: 2.68,
    cng: 1.88,
    lpg: 1.51,
    unit: "kg CO2 per liter"
  },

  food: {
    beef: 27.0,       // kg CO2 per kg of food
    lamb: 39.2,
    pork: 12.1,
    chicken: 6.9,
    fish: 6.1,
    eggs: 4.8,
    milk: 1.9,
    cheese: 13.5,
    rice: 2.7,
    wheat: 1.4,
    vegetables: 0.4,
    fruits: 0.5,
    lentils: 0.9,
    tofu: 2.0,
    unit: "kg CO2 per kg"
  },

  transport: {
    flight_domestic: 0.255,    // kg CO2 per km per passenger
    flight_international: 0.195,
    train: 0.041,
    bus: 0.089,
    car_petrol: 0.192,
    car_diesel: 0.171,
    motorcycle: 0.103,
    bicycle: 0,
    walking: 0,
    unit: "kg CO2 per km"
  },

  shopping: {
    clothing_tshirt: 8.0,      // kg CO2 per item
    clothing_jeans: 33.0,
    clothing_jacket: 30.0,
    smartphone: 70.0,
    laptop: 300.0,
    television: 200.0,
    furniture_chair: 30.0,
    furniture_table: 50.0,
    furniture_sofa: 100.0,
    books: 2.5,
    unit: "kg CO2 per item"
  },

  household: {
    water_per_liter: 0.0003,   // kg CO2 per liter
    natural_gas_per_m3: 2.0,   // kg CO2 per cubic meter
    unit: "various"
  }
};

// Impact equivalents for visualization
export const impactEquivalents = {
  trees_per_year: 21,          // kg CO2 absorbed by one tree per year
  ice_melted_per_kg: 3,        // square cm of arctic ice per kg CO2
  driving_km_per_kg: 4,        // km of car driving per kg CO2
  lightbulb_hours_per_kg: 10,  // hours of 60W bulb per kg CO2
  balloons_per_kg: 509,        // balloons filled with CO2 per kg
  smartphone_charges: 122,     // smartphone charges per kg CO2
};

// Carbon score calculation
export function calculateCarbonScore(monthlyFootprint: number): {
  score: number;
  rating: string;
  color: string;
} {
  // Average monthly footprint is around 400 kg CO2
  // Score is inversely related to footprint
  const avgMonthly = 400;
  const score = Math.max(0, Math.min(1000, Math.round(1000 - (monthlyFootprint / avgMonthly) * 500)));

  let rating: string;
  let color: string;

  if (score >= 800) {
    rating = "Eco Hero";
    color = "text-green-500";
  } else if (score >= 600) {
    rating = "Excellent";
    color = "text-green-400";
  } else if (score >= 400) {
    rating = "Good";
    color = "text-yellow-400";
  } else if (score >= 200) {
    rating = "Average";
    color = "text-orange-400";
  } else {
    rating = "Needs Improvement";
    color = "text-red-400";
  }

  return { score, rating, color };
}

// Calculate carbon from bill data
export function calculateCarbonFromBill(
  billType: string,
  amount: number,
  unit: string,
  region: string = "india"
): number {
  switch (billType.toLowerCase()) {
    case "electricity":
      const electricityFactor = emissionFactors.electricity[region as keyof typeof emissionFactors.electricity]
        || emissionFactors.electricity.default;
      return amount * (electricityFactor as number);

    case "petrol":
    case "fuel":
      return amount * emissionFactors.fuel.petrol;

    case "diesel":
      return amount * emissionFactors.fuel.diesel;

    case "lpg":
    case "gas":
      return amount * emissionFactors.fuel.lpg;

    default:
      return 0;
  }
}

// Get impact visualization data
export function getImpactVisualization(carbonKg: number) {
  return {
    trees: Math.round(carbonKg / impactEquivalents.trees_per_year * 100) / 100,
    iceMelted: Math.round(carbonKg * impactEquivalents.ice_melted_per_kg),
    drivingKm: Math.round(carbonKg * impactEquivalents.driving_km_per_kg),
    lightbulbHours: Math.round(carbonKg * impactEquivalents.lightbulb_hours_per_kg),
    balloons: Math.round(carbonKg * impactEquivalents.balloons_per_kg),
    smartphoneCharges: Math.round(carbonKg * impactEquivalents.smartphone_charges),
  };
}

// Get alternative suggestions for items
export function getAlternatives(item: string): {
  current: { name: string; carbon: number };
  alternatives: { name: string; carbon: number; savings: number }[];
} | null {
  const alternatives: Record<string, { current: { name: string; carbon: number }; alternatives: { name: string; carbon: number; savings: number }[] }> = {
    beef: {
      current: { name: "Beef (1kg)", carbon: 27 },
      alternatives: [
        { name: "Chicken (1kg)", carbon: 6.9, savings: 20.1 },
        { name: "Tofu (1kg)", carbon: 2.0, savings: 25 },
        { name: "Lentils (1kg)", carbon: 0.9, savings: 26.1 },
      ],
    },
    car: {
      current: { name: "Car (10km)", carbon: 1.92 },
      alternatives: [
        { name: "Bus (10km)", carbon: 0.89, savings: 1.03 },
        { name: "Train (10km)", carbon: 0.41, savings: 1.51 },
        { name: "Bicycle (10km)", carbon: 0, savings: 1.92 },
      ],
    },
    flight: {
      current: { name: "Flight (500km)", carbon: 127.5 },
      alternatives: [
        { name: "Train (500km)", carbon: 20.5, savings: 107 },
        { name: "Bus (500km)", carbon: 44.5, savings: 83 },
      ],
    },
  };

  return alternatives[item.toLowerCase()] || null;
}
