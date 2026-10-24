"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Pantry, PantryProduct } from "@/lib/types";

import {
  SERVING_UNITS,
  type ProductDraft,
  type ServingUnit,
  validateDraft,
} from "./pantry-helpers";

const NEW_CATEGORY = "__new__";

export type ProductDialogResult = {
  draft: ProductDraft;
  newCategory?: { displayName: string; aliases: string[] };
};

type ProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pantry: Pantry;
  /** When set, the dialog edits this product; otherwise it adds a new one. */
  editing?: PantryProduct | null;
  /** Preselect this category when adding. */
  defaultCategoryId?: string | null;
  onSubmit: (result: ProductDialogResult) => void;
};

export function ProductDialog({
  open,
  onOpenChange,
  pantry,
  editing,
  defaultCategoryId,
  onSubmit,
}: ProductDialogProps) {
  const isEditing = Boolean(editing);

  const [categoryId, setCategoryId] = useState<string>("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatAliases, setNewCatAliases] = useState("");
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<ServingUnit>("teaspoon");
  const [mg, setMg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Seed the form whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setNewCatName("");
    setNewCatAliases("");
    if (editing) {
      setCategoryId(editing.category_id);
      setBrand(editing.brand);
      setName(editing.name);
      // Prefill from the first stored unit as a 1-serving value.
      const [firstUnit, firstMg] = Object.entries(
        editing.sodium_mg_per_unit,
      )[0] ?? ["teaspoon", 0];
      setUnit((firstUnit as ServingUnit) ?? "teaspoon");
      setQuantity("1");
      setMg(String(firstMg ?? ""));
    } else {
      setCategoryId(defaultCategoryId ?? pantry.categories[0]?.category_id ?? "");
      setBrand("");
      setName("");
      setQuantity("1");
      setUnit("teaspoon");
      setMg("");
    }
  }, [open, editing, defaultCategoryId, pantry.categories]);

  const usingNewCategory = !isEditing && categoryId === NEW_CATEGORY;

  const parsed = useMemo(
    () => ({
      quantity: Number.parseFloat(quantity),
      mg: Number.parseFloat(mg),
    }),
    [quantity, mg],
  );

  function handleSubmit() {
    const draft: ProductDraft = {
      categoryId: usingNewCategory ? "" : categoryId,
      brand,
      name,
      quantity: parsed.quantity,
      unit,
      mg: parsed.mg,
    };

    const result = validateDraft(
      draft,
      usingNewCategory ? { displayName: newCatName } : undefined,
      usingNewCategory,
    );
    if (!result.ok) {
      setError(result.message);
      return;
    }

    const aliases = newCatAliases
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);

    onSubmit({
      draft,
      newCategory: usingNewCategory
        ? {
            displayName: newCatName,
            aliases: aliases.length ? aliases : [newCatName.trim().toLowerCase()],
          }
        : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit product" : "Add item"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Category */}
          <div className="grid gap-1.5">
            <Label htmlFor="category">Category</Label>
            {isEditing ? (
              <Input
                id="category"
                value={
                  pantry.categories.find((c) => c.category_id === categoryId)
                    ?.display_name ?? categoryId
                }
                disabled
              />
            ) : (
              <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v as string)}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {pantry.categories.map((c) => (
                    <SelectItem key={c.category_id} value={c.category_id}>
                      {c.display_name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_CATEGORY}>+ New category…</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* New category fields */}
          {usingNewCategory && (
            <div className="grid gap-4 rounded-lg border border-dashed p-3">
              <div className="grid gap-1.5">
                <Label htmlFor="new-cat-name">New category name</Label>
                <Input
                  id="new-cat-name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Oyster sauce"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="new-cat-aliases">
                  Aliases{" "}
                  <span className="font-normal text-muted-foreground">
                    (comma separated, optional)
                  </span>
                </Label>
                <Input
                  id="new-cat-aliases"
                  value={newCatAliases}
                  onChange={(e) => setNewCatAliases(e.target.value)}
                  placeholder="oyster sauce, dau hao"
                />
              </div>
            </div>
          )}

          {/* Brand + name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Kikkoman"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Soy Sauce"
              />
            </div>
          </div>

          {/* Serving: quantity + unit + mg */}
          <div className="grid gap-1.5">
            <Label>Label serving</Label>
            <div className="grid grid-cols-[5rem_1fr] gap-2 sm:grid-cols-[6rem_1fr_7rem]">
              <Input
                aria-label="Serving quantity"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
              />
              <Select
                value={unit}
                onValueChange={(v) => setUnit(v as ServingUnit)}
              >
                <SelectTrigger aria-label="Serving unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVING_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                aria-label="Sodium in milligrams for this serving"
                type="number"
                min="0"
                step="any"
                value={mg}
                onChange={(e) => setMg(e.target.value)}
                placeholder="mg"
                className="col-span-2 sm:col-span-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For example &ldquo;1 tablespoon = 960 mg&rdquo;. We store the
              sodium per single unit.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSubmit}>
            {isEditing ? "Save changes" : "Add to pantry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
