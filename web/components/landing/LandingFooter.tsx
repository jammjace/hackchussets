import { Info } from "lucide-react";

// Section 9.1 footer disclaimer (Na(h) disclaimer line, §09).
export function LandingFooter() {
  return (
    <footer className="mt-4 border-t border-stone pt-6">
      <p className="flex items-center gap-2 font-ui text-sm text-ink-soft">
        <Info className="size-4 shrink-0" aria-hidden />
        Estimates from your pantry labels. Not medical advice.
      </p>
    </footer>
  );
}
