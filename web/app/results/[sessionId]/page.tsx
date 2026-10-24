import { Suspense } from "react";

import { ResultsView } from "./results-view";

export default function ResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  return (
    <Suspense>
      <ResultsView params={params} />
    </Suspense>
  );
}
