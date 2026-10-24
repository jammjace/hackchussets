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
    <Card className="bg-saffron ring-ink">
      <CardContent className="flex gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
        <div className="space-y-1">
          <p className="font-ui font-semibold text-ink">
            Some additions couldn&apos;t be counted, so the real total is higher.
          </p>
          {warnings.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 font-ui text-sm text-ink-soft">
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
