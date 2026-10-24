"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ProductDialog,
  type ProductDialogResult,
} from "@/components/pantry/product-dialog";
import {
  addProduct,
  categoryById,
  deleteProduct,
  describeSodium,
  productsForCategory,
  setDefault,
  updateProduct,
} from "@/components/pantry/pantry-helpers";
import { getPantry, putPantry, resetPantry } from "@/lib/api";
import type { Pantry, PantryProduct } from "@/lib/types";

type LoadState =
  | { state: "loading" }
  | { state: "ok"; pantry: Pantry }
  | { state: "error"; message: string };

export default function PantryPage() {
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PantryProduct | null>(null);
  const [addCategoryId, setAddCategoryId] = useState<string | null>(null);

  const [resetOpen, setResetOpen] = useState(false);

  const fetchPantry = useCallback(() => {
    setLoad({ state: "loading" });
    getPantry()
      .then((pantry) => setLoad({ state: "ok", pantry }))
      .catch((err: unknown) =>
        setLoad({
          state: "error",
          message:
            err instanceof Error ? err.message : "Couldn't load your pantry.",
        }),
      );
  }, []);

  useEffect(() => {
    fetchPantry();
  }, [fetchPantry]);

  // Always PUT the whole pantry. Optimistically show the new state, roll back
  // on failure.
  const save = useCallback(
    async (next: Pantry, successMsg: string) => {
      const previous = load.state === "ok" ? load.pantry : null;
      setSaving(true);
      setLoad({ state: "ok", pantry: next });
      try {
        const saved = await putPantry(next);
        setLoad({ state: "ok", pantry: saved });
        toast.success(successMsg);
      } catch (err: unknown) {
        if (previous) setLoad({ state: "ok", pantry: previous });
        toast.error(
          err instanceof Error ? err.message : "Couldn't save your pantry.",
        );
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  function openAdd(categoryId?: string) {
    setEditing(null);
    setAddCategoryId(categoryId ?? null);
    setDialogOpen(true);
  }

  function openEdit(product: PantryProduct) {
    setEditing(product);
    setAddCategoryId(null);
    setDialogOpen(true);
  }

  function handleDialogSubmit(result: ProductDialogResult) {
    if (load.state !== "ok") return;
    if (editing) {
      const next = updateProduct(load.pantry, editing.product_id, result.draft);
      void save(next, "Product updated.");
    } else {
      const next = addProduct(load.pantry, result.draft, result.newCategory);
      void save(next, "Product added.");
    }
  }

  function handleSetDefault(categoryId: string, product: PantryProduct) {
    if (load.state !== "ok") return;
    const next = setDefault(load.pantry, categoryId, product.product_id);
    void save(next, `${product.brand} ${product.name} is now the default.`);
  }

  function handleDelete(product: PantryProduct) {
    if (load.state !== "ok") return;
    const next = deleteProduct(load.pantry, product.product_id);
    void save(next, "Product removed.");
  }

  async function handleReset() {
    setResetOpen(false);
    setSaving(true);
    try {
      const pantry = await resetPantry();
      setLoad({ state: "ok", pantry });
      toast.success("Pantry reset to defaults.");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't reset your pantry.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Your pantry
        </h1>
        <p className="text-muted-foreground">
          These are the seasonings we recognise and their sodium per serving.
          Keep them accurate for the best estimates.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => openAdd()} disabled={load.state !== "ok"}>
          Add item
        </Button>
        <Button variant="outline" render={<Link href="/pantry/receipt" />}>
          Scan a receipt
        </Button>
        <Button
          variant="outline"
          onClick={() => setResetOpen(true)}
          disabled={load.state !== "ok" || saving}
        >
          Reset to defaults
        </Button>
      </div>

      {load.state === "loading" && <PantrySkeleton />}

      {load.state === "error" && (
        <Card>
          <CardContent className="space-y-3 text-center">
            <p className="font-medium">Couldn&apos;t load your pantry</p>
            <p className="text-sm text-muted-foreground">{load.message}</p>
            <Button onClick={fetchPantry}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {load.state === "ok" && (
        <div className="space-y-6">
          {load.pantry.categories.map((category) => {
            const products = productsForCategory(
              load.pantry,
              category.category_id,
            );
            return (
              <section key={category.category_id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-medium">
                    {category.display_name}
                  </h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openAdd(category.category_id)}
                  >
                    + Add
                  </Button>
                </div>

                {products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No products in this category yet.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {products.map((product) => {
                      const isDefault =
                        category.default_product_id === product.product_id;
                      return (
                        <Card key={product.product_id}>
                          <CardContent className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">
                                    {product.brand} {product.name}
                                  </span>
                                  {isDefault && <Badge>Default</Badge>}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                  {describeSodium(product)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {product.source}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEdit(product)}
                                disabled={saving}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleSetDefault(category.category_id, product)
                                }
                                disabled={saving || isDefault}
                              >
                                {isDefault ? "Default" : "Set as default"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(product)}
                                disabled={saving || isDefault}
                                title={
                                  isDefault
                                    ? "Can't delete the category default"
                                    : undefined
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

          {/* Continue */}
          <div className="flex justify-end pt-2">
            <Button render={<Link href="/how-to-record" />}>Continue</Button>
          </div>
        </div>
      )}

      {/* Add / edit dialog */}
      {load.state === "ok" && (
        <ProductDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          pantry={load.pantry}
          editing={editing}
          defaultCategoryId={addCategoryId}
          onSubmit={handleDialogSubmit}
        />
      )}

      {/* Reset confirmation */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset pantry to defaults?</DialogTitle>
            <DialogDescription>
              This replaces your whole pantry with the built-in defaults. Any
              products you added or edited will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={handleReset}>
              Reset pantry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function PantrySkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((s) => (
        <div key={s} className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
