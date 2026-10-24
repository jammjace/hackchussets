"use client";

import { TriangleAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type IncompleteNoticeProps = {
  warnings: string[];
};

/**
 * Section 9.7 item 2. Shown when `is_incomplete`. Lists the warnings with the
 * fixed lead copy.
 */
export function IncompleteNotice({ warnings }: IncompleteNoticeProps) {
  return (
    <Card className="border-amber-300 bg-amber-50 ring-amber-200 dark:bg-amber-950/30">
      <CardContent className="flex gap-3">
        <TriangleAlert
          className="mt-0.5 size-5 shrink-0 text-amber-600"
          aria-hidden
        />
        <div className="space-y-1">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Some additions couldn&apos;t be counted, so the real total is higher.
          </p>
          {warnings.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-amber-800 dark:text-amber-300">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
