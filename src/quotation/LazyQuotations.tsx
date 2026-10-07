import { lazy, Suspense } from "react";
const Module = lazy(() =>
  import("./Quotations").then((module) => ({ default: module.Quotations })),
);
export function Quotations(props: {
  id?: string;
  mode?: string;
  projectId?: string;
}) {
  return (
    <Suspense fallback={<p role="status">Loading quotations…</p>}>
      <Module {...props} />
    </Suspense>
  );
}
