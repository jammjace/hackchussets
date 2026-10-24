import type { PantryProduct } from "@/lib/types";

/**
 * Full product data for the products a receipt scan can add, keyed by
 * product_id. The mock receipt only carries ids and display text, so this
 * catalogue supplies the brand, name, sodium and source needed to add a
 * well-formed product to the pantry. Values mirror the default pantry
 * (KIRO_HANDOFF.md section 6.4).
 */
export const RECEIPT_PRODUCTS: Record<string, PantryProduct> = {
  redboat_40n: {
    product_id: "redboat_40n",
    category_id: "fish_sauce",
    brand: "Red Boat",
    name: "40N Fish Sauce",
    sodium_mg_per_unit: { tablespoon: 1430 },
    source: "US retail label: 1,430 mg per 1 Tbsp",
  },
  kikkoman_soy: {
    product_id: "kikkoman_soy",
    category_id: "soy_sauce",
    brand: "Kikkoman",
    name: "Soy Sauce",
    sodium_mg_per_unit: { tablespoon: 960 },
    source: "Kikkoman USA label: 960 mg per 1 Tbsp (15 mL)",
  },
  knorr_chicken_cube: {
    product_id: "knorr_chicken_cube",
    category_id: "chicken_bouillon",
    brand: "Knorr",
    name: "Chicken Flavor Bouillon Cube (24 ct, US)",
    sodium_mg_per_unit: { cube: 2080 },
    source: "US label: 1,040 mg per half cube",
  },
  goya_sazon_coriander_annatto: {
    product_id: "goya_sazon_coriander_annatto",
    category_id: "sazon",
    brand: "Goya",
    name: "Sazon Coriander & Annatto",
    sodium_mg_per_unit: { packet: 850, teaspoon: 680 },
    source:
      "US label: 170 mg per 1/4 tsp; packet value derived (about 5 servings per packet)",
  },
};
