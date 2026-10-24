"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clonePantry } from "@/components/pantry/pantry-helpers";
import { RECEIPT_PRODUCTS } from "@/components/pantry/receipt-catalogue";
import { getPantry, putPantry } from "@/lib/api";
import type { Pantry } from "@/lib/types";
import receiptMock from "@/data/receipt.mock.json";

type ReceiptItem = {
  item_code: string;
  item: string;
  category_id: string;
  product_id: string;
  sodium_text: string;
};

const RECEIPT = receiptMock as { store: string; items: ReceiptItem[] };

type Stage = "idle" | "reading" | "table";

export default function ReceiptPage() {
  const router = useRouter();

  const [pantry, setPantry] = useState<Pantry | null>(null);
  const [pantryError, setPantryError] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPantry()
      .then(setPantry)
      .catch((err: unknown) =>
        setPantryError(
          err instanceof Error ? err.message : "Couldn't load your pantry.",
        ),
      );
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // product_ids already in the pantry.
  const existingIds = useMemo(
    () => new Set(pantry?.products.map((p) => p.product_id) ?? []),
    [pantry],
  );

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    // Fake "Reading receipt..." progress for 1.5 s, then show the table.
    setStage("reading");
    setProgress(0);
    const start = Date.now();
    const DURATION = 1500;
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / DURATION) * 100));
      setProgress(pct);
      if (elapsed >= DURATION) {
        clearInterval(timer);
        // Pre-tick the rows that aren't already in the pantry.
        const initial: Record<string, boolean> = {};
        for (const row of RECEIPT.items) {
          initial[row.product_id] = !existingIds.has(row.product_id);
        }
        setTicked(initial);
        setStage("table");
      }
    }, 60);
  }

  function toggle(productId: string) {
    setTicked((prev) => ({ ...prev, [productId]: !prev[productId] }));
  }

  async function addToPantry() {
    if (!pantry) return;

    const toAdd = RECEIPT.items.filter(
      (row) => ticked[row.product_id] && !existingIds.has(row.product_id),
    );

    if (toAdd.length === 0) {
      toast.info("Nothing new to add — those products are already in your pantry.");
      router.push("/pantry");
      return;
    }

    const next = clonePantry(pantry);
    let added = 0;
    for (const row of toAdd) {
      const product = RECEIPT_PRODUCTS[row.product_id];
      if (!product) continue; // unknown product in the mock; skip safely
      next.products.push({ ...product, sodium_mg_per_unit: { ...product.sodium_mg_per_unit } });
      // If the category exists and has no default, make this the default.
      const category = next.categories.find(
        (c) => c.category_id === product.category_id,
      );
      if (category && !category.default_product_id) {
        category.default_product_id = product.product_id;
      }
      added += 1;
    }

    setSaving(true);
    try {
      await putPantry(next);
      toast.success(
        added === 1 ? "Added 1 product to your pantry." : `Added ${added} products to your pantry.`,
      );
      router.push("/pantry");
    } catch (err: unknown) {
      setSaving(false);
      toast.error(
        err instanceof Error ? err.message : "Couldn't update your pantry.",
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <Badge variant="secondary">Demo: receipt scanning is simulated</Badge>
        <h1 className="font-heading text-3xl font-normal tracking-tight sm:text-4xl">
          Scan a receipt
        </h1>
        <p className="text-muted-foreground">
          Pick a photo of your receipt and we&apos;ll pull out the seasonings to
          add to your pantry.
        </p>
      </div>

      {pantryError && (
        <Card>
          <CardContent className="text-sm text-chilli">
            {pantryError}
          </CardContent>
        </Card>
      )}

      {/* Image picker */}
      <Card>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="font-medium">
              {previewUrl ? "Choose a different photo" : "Choose a receipt photo"}
            </span>
            <span className="text-sm text-muted-foreground">
              Any image will do for the demo
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onPick}
          />

          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="max-h-64 w-full rounded-xl object-contain ring-1 ring-foreground/10"
            />
          )}
        </CardContent>
      </Card>

      {/* Reading progress */}
      {stage === "reading" && (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">Reading receipt…</p>
            <Progress value={progress} />
          </CardContent>
        </Card>
      )}

      {/* Items table */}
      {stage === "table" && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              From your {RECEIPT.store} receipt. Tick the items to add.
            </p>

            {!pantry ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Item</TableHead>
                    <TableHead>Sodium</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RECEIPT.items.map((row) => {
                    const already = existingIds.has(row.product_id);
                    return (
                      <TableRow key={row.item_code}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Add ${row.item}`}
                            className="size-4 accent-primary disabled:opacity-50"
                            checked={Boolean(ticked[row.product_id]) && !already}
                            disabled={already}
                            onChange={() => toggle(row.product_id)}
                          />
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {row.item}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.sodium_text}
                        </TableCell>
                        <TableCell className="text-right">
                          {already ? (
                            <Badge variant="outline">Already in pantry</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              New
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={addToPantry} disabled={saving || !pantry}>
                {saving ? "Adding…" : "Add to pantry"}
              </Button>
              <Button variant="outline" render={<Link href="/pantry" />}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stage === "idle" && (
        <div className="flex justify-start">
          <Button variant="outline" render={<Link href="/pantry" />}>
            Back to pantry
          </Button>
        </div>
      )}
    </main>
  );
}
