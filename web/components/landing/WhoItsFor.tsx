import { Card, CardContent } from "@/components/ui/card";

// Section 9.1 "Who it's for".
const DISHES = ["Phở gà", "Arroz con pollo", "Sopa", "Canh chua", "Pozole"];

export function WhoItsFor() {
  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="font-display text-4xl font-normal tracking-tight">
          Who it&apos;s for
        </h2>
        <p className="max-w-2xl font-ui text-lg text-ink-soft">
          Home cooks managing blood pressure — Latino and Vietnamese American
          households first. The dishes you already make, counted honestly.
        </p>
        <div className="flex flex-wrap gap-2">
          {DISHES.map((dish) => (
            <span
              key={dish}
              className="rounded-pill border border-stone bg-canvas px-3 py-1.5 font-ui text-sm text-ink"
            >
              {dish}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
