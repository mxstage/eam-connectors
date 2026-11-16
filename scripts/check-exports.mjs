// Import every public entry point from the built package (dist) by its package name and check key exports.
// Run after `npm run build`. Fails if an entry is missing or a key export disappeared.
const expected = {
  "@mxstage/eam-connectors": ["MaximoClient", "loadRecords", "buildWhere", "getObjectStructureInfo", "ValueListService", "planCommit", "executeCommit", "attemptPlan", "batchSizeOf", "describePlanError", "reloadParents", "writeLogCsv", "setLocale", "getLocale", "defineMessages", "STATUS_RULES", "commitMessages"],
  "@mxstage/eam-connectors/license": ["parseLicenseKey", "licenseHostOf", "payloadState", "LICENSE_PUBLIC_KEYS", "LicenseClient", "licenseBlocker", "environmentBadge", "authorizeFailure", "licenseMessages"],
  "@mxstage/eam-connectors/node": ["ConnectionStore", "SecretBox", "LicenseStore", "handleMaximoProxy", "normalizeConnectionUrl", "stateDir", "authorizeWrite", "createLicenseWriteGuard"],
  "@mxstage/eam-connectors/testing": ["createFakeMaximo", "sampleSeed"],
  "@mxstage/eam-connectors/eam": ["MAXIMO_EAM_SOURCES", "buildAssetTree", "readMaximoAssetTree", "readMaximoPlans", "readMaximoWorkRecords"],
};
let failed = false;
for (const [entry, names] of Object.entries(expected)) {
  const mod = await import(entry);
  const missing = names.filter((n) => !(n in mod));
  if (missing.length > 0) {
    failed = true;
    console.error(`${entry}: missing ${missing.join(", ")}`);
  } else console.log(`${entry}: ${Object.keys(mod).length} exports`);
}
// The locale is one shared state: the main entry and /license must see the same setting.
const core = await import("@mxstage/eam-connectors");
const license = await import("@mxstage/eam-connectors/license");
core.setLocale("ja");
if (!license.licenseMessages().badge.test.includes("テスト")) {
  failed = true;
  console.error("the locale is not shared between entry points");
}
core.setLocale("en");
if (failed) process.exit(1);
