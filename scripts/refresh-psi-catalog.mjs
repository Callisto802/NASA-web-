import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const investigationPath = path.join(root, "src", "data", "psi_investigations.json");
const catalogPath = path.join(root, "src", "data", "psi_catalog.json");
const summaryPath = path.join(root, "src", "data", "psi_catalog_summary.json");
const investigations = JSON.parse(fs.readFileSync(investigationPath, "utf8"));
const queue = [...investigations];
const catalog = {};
const errors = [];

async function worker() {
  while (queue.length) {
    const investigation = queue.shift();
    if (!investigation) return;
    const accession = investigation.id;
    const apiUrl = `https://psi.nasa.gov/geode-py/ws/repo/investigations/${encodeURIComponent(accession)}`;
    let responseData;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        // Some PSI records have large publication/file indexes and take 45+ seconds.
        const response = await fetch(apiUrl, { signal: AbortSignal.timeout(60_000) });
        if (!response.ok) throw new Error(`NASA PSI returned HTTP ${response.status}`);
        responseData = await response.json();
        if (responseData.accession !== accession || !responseData.title) {
          throw new Error("NASA PSI response did not match the requested accession.");
        }
        break;
      } catch (error) {
        if (attempt === 3) errors.push(`${accession}: ${error.message}`);
        else await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    if (!responseData?.title) continue;
    const toFiles = (files = []) => files.map((file) => {
      const fileId = file._id?.$oid;
      const fileVersion = Number(file.version) || 1;
      const studyVersion = Number(responseData.version) || 1;
      return {
        title: file.file_name || "NASA PSI data file",
        sizeBytes: Number(file.file_size) || null,
        ...(fileId
          ? {
              downloadUrl: `https://psi.nasa.gov/geode-py/ws/studies/${encodeURIComponent(accession)}/download?file=${encodeURIComponent(fileId)}&version=${fileVersion}&studyVersion=${studyVersion}`,
            }
          : {}),
      };
    });

    catalog[accession] = {
      title: responseData.title,
      recordUrl: `https://psi.nasa.gov/physci/repo/data/investigations/${accession}`,
      apiUrl,
      doi: responseData.doi || null,
      version: Number(responseData.version) || null,
      updatedAt: responseData.modifiedDate || null,
      releaseDate: responseData.releaseDate || null,
      license: responseData.licenseName
        ? {
            name: responseData.licenseName,
            url: responseData.licenseLink || null,
            identifier: responseData.licenseIdentifier || null,
          }
        : null,
      objective: responseData.objective || null,
      approach: responseData.approach || null,
      hypothesis: responseData.hypothesis || null,
      researchImpacts: responseData.researchImpacts || null,
      experimentalTables: toFiles(responseData.experimentalTable),
      modelingTables: toFiles(responseData.modelingTable),
      publications: (responseData.publications || []).map((publication) => ({
        title: publication.title || "Untitled NASA PSI publication",
        authors: publication.authorList || null,
        doi: publication.doi || null,
        status: publication.status?.annotationValue || null,
        url: publication.doi ? `https://doi.org/${publication.doi}` : null,
      })),
    };
    process.stdout.write(`${accession} retrieved (NASA PSI version ${responseData.version ?? "unknown"})\n`);
  }
}

await Promise.all(Array.from({ length: 2 }, () => worker()));
const missing = investigations.map(({ id }) => id).filter((id) => !catalog[id]);
if (missing.length) {
  console.error(`Snapshot was not changed. Missing NASA records: ${missing.join(", ")}. ${errors.join("; ")}`);
  process.exitCode = 1;
} else {
  const retrievedAt = new Date().toISOString();
  const snapshot = {
    source: "NASA Physical Sciences Informatics public repository API",
    retrievedAt,
    records: catalog,
  };
  const summary = {
    retrievedAt,
    publicationEntries: Object.values(catalog).reduce((sum, entry) => sum + entry.publications.length, 0),
    tableFileEntries: Object.values(catalog).reduce(
      (sum, entry) => sum + entry.experimentalTables.length + entry.modelingTables.length,
      0,
    ),
  };
  const outputs = [
    [catalogPath, `${JSON.stringify(snapshot, null, 2)}\n`],
    [summaryPath, `${JSON.stringify(summary, null, 2)}\n`],
  ];
  for (const [filePath, contents] of outputs) {
    const temporaryPath = `${filePath}.tmp`;
    fs.writeFileSync(temporaryPath, contents, "utf8");
    fs.renameSync(temporaryPath, filePath);
  }
  console.log(`Updated NASA PSI snapshot for ${investigations.length} investigations: ${summary.publicationEntries} publication entries and ${summary.tableFileEntries} table files.`);
}
