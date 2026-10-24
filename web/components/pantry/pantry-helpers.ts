import type { Pantry, PantryCategory, PantryProduct } from "@/lib/types";
import { formatNumber } from "@/lib/format";

export const SERVING_UNITS = [
  "teaspoon",
  "tablespoon",
  "cup",
  "ml",
  "g",
  "cube",
  "packet",
  "piece",
] as const;

export type ServingUnit = (typeof SERVING_UNITS)[number];

/** Deep-ish clone of a pantry so edits never mutate the loaded object. */
export function clonePantry(pantry: Pantry): Pantry {
  return {
    ...pantry,
    unit_aliases: { ...pantry.unit_aliases },
    volume_ml: { ...pantry.volume_ml },
    categories: pantry.categories.map((c) => ({ ...c, aliases: [...c.aliases] })),
    products: pantry.products.map((p) => ({
      ...p,
      sodium_mg_per_unit: { ...p.sodium_mg_per_unit },
    })),
  };
}

/** Products belonging to a category, in pantry order. */
export function productsForCategory(
  pantry: Pantry,
  categoryId: string,
): PantryProduct[] {
  return pantry.products.filter((p) => p.category_id === categoryId);
}

export function categoryById(
  pantry: Pantry,
  categoryId: string,
): PantryCategory | undefined {
  return pantry.categories.find((c) => c.category_id === categoryId);
}

/**
 * Human-readable sodium summary for a product, e.g. "960 mg per tablespoon".
 * Lists every stored unit. Returns a neutral message if none are set.
 */
export function describeSodium(product: PantryProduct): string {
  const entries = Object.entries(product.sodium_mg_per_unit);
  if (entries.length === 0) return "No sodium value set";
  return entries
    .map(([unit, mg]) => `${formatNumber(mg)} mg per ${unit}`)
    .join(", ");
}

/** A simple slug for generated category/product ids. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "item"
  );
}

/** Ensure a generated id is unique against existing ids. */
export function uniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

export type ProductDraft = {
  categoryId: string;
  brand: string;
  name: string;
  quantity: number;
  unit: ServingUnit;
  mg: number;
};

/**
 * Build the sodium_mg_per_unit record from a label serving (section 6.3):
 * sodium_mg_per_unit[unit] = mg / quantity.
 */
export function perUnitFromServing(draft: ProductDraft): Record<string, number> {
  return { [draft.unit]: Math.round((draft.mg / draft.quantity) * 10) / 10 };
}

/** Add a new product (and category, if new) to a cloned pantry. */
export function addProduct(
  pantry: Pantry,
  draft: ProductDraft,
  newCategory?: { displayName: string; aliases: string[] },
): Pantry {
  const next = clonePantry(pantry);

  let categoryId = draft.categoryId;
  if (newCategory) {
    const existingCatIds = new Set(next.categories.map((c) => c.category_id));
    categoryId = uniqueId(slugify(newCategory.displayName), existingCatIds);
    next.categories.push({
      category_id: categoryId,
      display_name: newCategory.displayName.trim(),
      aliases: newCategory.aliases,
      default_product_id: "", // set below to the product we're adding
    });
  }

  const existingProductIds = new Set(next.products.map((p) => p.product_id));
  const productId = uniqueId(
    slugify(`${draft.brand} ${draft.name}`),
    existingProductIds,
  );

  next.products.push({
    product_id: productId,
    category_id: categoryId,
    brand: draft.brand.trim(),
    name: draft.name.trim(),
    sodium_mg_per_unit: perUnitFromServing(draft),
    source: "Added from the pantry editor",
  });

  // If the category has no default yet (new category, or somehow empty),
  // make this product the default.
  const category = next.categories.find((c) => c.category_id === categoryId);
  if (category && !category.default_product_id) {
    category.default_product_id = productId;
  }

  return next;
}

/** Replace an existing product's editable fields in a cloned pantry. */
export function updateProduct(
  pantry: Pantry,
  productId: string,
  draft: ProductDraft,
): Pantry {
  const next = clonePantry(pantry);
  const product = next.products.find((p) => p.product_id === productId);
  if (product) {
    product.brand = draft.brand.trim();
    product.name = draft.name.trim();
    product.sodium_mg_per_unit = perUnitFromServing(draft);
  }
  return next;
}

/** Set a product as its category's default. */
export function setDefault(
  pantry: Pantry,
  categoryId: string,
  productId: string,
): Pantry {
  const next = clonePantry(pantry);
  const category = next.categories.find((c) => c.category_id === categoryId);
  if (category) category.default_product_id = productId;
  return next;
}

/** Delete a product. Not permitted for the category's current default. */
export function deleteProduct(pantry: Pantry, productId: string): Pantry {
  const next = clonePantry(pantry);
  next.products = next.products.filter((p) => p.product_id !== productId);
  return next;
}

export type ValidationResult = { ok: true } | { ok: false; message: string };

/** Validate a product draft (section 9.3): quantity > 0, mg > 0, brand & name required. */
export function validateDraft(
  draft: Partial<ProductDraft>,
  newCategory?: { displayName: string },
  usingNewCategory?: boolean,
): ValidationResult {
  if (usingNewCategory) {
    if (!newCategory?.displayName.trim()) {
      return { ok: false, message: "Give the new category a name." };
    }
  } else if (!draft.categoryId) {
    return { ok: false, message: "Choose a category." };
  }
  if (!draft.brand?.trim()) return { ok: false, message: "Brand is required." };
  if (!draft.name?.trim()) return { ok: false, message: "Name is required." };
  if (!draft.quantity || draft.quantity <= 0) {
    return { ok: false, message: "Serving quantity must be greater than 0." };
  }
  if (!draft.mg || draft.mg <= 0) {
    return { ok: false, message: "Sodium (mg) must be greater than 0." };
  }
  return { ok: true };
}
