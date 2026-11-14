import type { PSICatalogEntry } from "../types";
import summary from "./psi_catalog_summary.json";

interface CatalogSnapshot {
  source: string;
  retrievedAt: string;
  records: Record<string, PSICatalogEntry>;
}

export const NASA_PSI_CATALOG_SUMMARY = summary;

let snapshotPromise: Promise<CatalogSnapshot> | undefined;

export function getPSICatalogEntry(id: string): Promise<PSICatalogEntry | undefined> {
  snapshotPromise ??= import("./psi_catalog.json").then(
    (module) => module.default as unknown as CatalogSnapshot,
  );
  return snapshotPromise.then((snapshot) => snapshot.records[id]);
}
