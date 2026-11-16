# @mxstage/eam-connectors

Shared parts for connecting tools to EAM systems — IBM Maximo first, with IFS and SAP planned.
They were cut out of [MX Stage](https://github.com/mxstage/mxstage) so that MX Stage and MOYAI use one implementation
of the Maximo client, the guarded commit engine, license keys and saved connections.

> **License:** Business Source License 1.1 (see [LICENSE](LICENSE)). Production use is allowed **except** creating,
> changing or deleting data in a Production Maximo Environment; reading production data is allowed. Each version
> becomes Apache-2.0 four years after its first public release. Licensor: TSUNAGI.

## Install

```sh
npm install @mxstage/eam-connectors
# until the first npm release, from git (npm runs the build through `prepare`):
npm install github:mxstage/eam-connectors#<commit>
```

ESM only, Node 20 or later (the main entry and `/license` also run in browsers). TypeScript declarations are included.

## Entry points

| Import | Runs in | What |
| --- | --- | --- |
| `@mxstage/eam-connectors` | browser, Node | `MaximoClient`; query building (`buildSelect`, `buildWhere`, …); `loadRecords`; metadata (`getObjectStructureInfo`, `listObjectStructures`, …); value lists (`ValueListService`, `ConnectionProvider`); the commit engine (`planCommit`, `validatePlans`, `executeCommit`, `attemptPlan`, `batchSizeOf`, `describePlanError`, `reloadParents`, `writeLogCsv`) and its messages; status rules; sheet/model types; the locale (`setLocale`, `getLocale`, `defineMessages`) |
| `@mxstage/eam-connectors/license` | browser, Node | `parseLicenseKey`, `licenseHostOf`, `payloadState`, `LICENSE_PUBLIC_KEYS`; the headless gate `LicenseClient` + `licenseBlocker`, `environmentBadge`, `authorizeFailure`; license messages |
| `@mxstage/eam-connectors/node` | Node | `ConnectionStore`, `SecretBox`, `LicenseStore`, `handleMaximoProxy`, `normalizeConnectionUrl`, `stateDir()`, the write guard (`authorizeWrite`, `createLicenseWriteGuard`) |
| `@mxstage/eam-connectors/testing` | browser, Node | An in-memory fake Maximo REST API: `createFakeMaximo`, `sampleSeed` |
| `@mxstage/eam-connectors/eam` | browser, Node | EAM intermediate forms and their Maximo mapping (see below) |

## Defaults that are shared with MX Stage

The defaults are MX Stage's current values, so a host that keeps them shares saved connections and license keys
with MX Stage on the same PC (MOYAI keeps the defaults). All can be overridden:

| What | Default | Override |
| --- | --- | --- |
| State folder | `~/.config/mxstage` (Windows: `%USERPROFILE%\.config\mxstage`) | `stateDir({ home, name })`; `dir` on `ConnectionStore`, `SecretBox`, `LicenseStore` |
| macOS keychain item | service `MX Stage`, account `connections-master-key` | `new SecretBox({ keychainService, keychainAccount })` |
| Windows DPAPI entropy | `mxstage-connections` | `new SecretBox({ dpapiEntropy })` |
| Environment declarations | `localStorage` key `mxstage.maximo.environments` (the storage object is passed in) | `new LicenseClient({ storage, storageKey })` |
| Past-work status preference | `localStorage` key `mxstage.maximo.pastStatus` (storage passed in) | `createStatusPrefs(storage)` |
| Locale preference key | `mxstage.locale` (`LOCALE_STORAGE_KEY`; reading it is up to the host) | — |
| Reserved demo hosts / IDs | `*.mxstage.invalid`, `demo-ja`, `demo-en` | `ConnectionStore({ reserved })`, `normalizeConnectionUrl(url, reserved)`, `handleMaximoProxy({ isReservedHost })`, `LicenseClient({ isBuiltInTest })` |

Override names are limited to letters, digits, space, `.`, `_` and `-`, because they are passed to OS tools.

There is **one** locale for the whole package (and for the host that uses it): call `setLocale("en" | "ja")` from the
main entry. Every entry point reads the same setting.

## Write guard for the `/mx` relay

`handleMaximoProxy` relays requests to Maximo and adds the API key. It does **not** check licenses by itself:
MX Stage checks them in its work screen before committing, so MX Stage leaves the guard off. A host that lets other
clients write through the relay should turn it on:

```ts
import { LicenseStore, createLicenseWriteGuard, handleMaximoProxy } from "@mxstage/eam-connectors/node";

const licenses = new LicenseStore();
const writeGuard = createLicenseWriteGuard({ licenses, environmentOf: (origin) => myEnvironments.get(origin) ?? null });
handleMaximoProxy(req, res, url, { allowedHosts: [], insecure: false, writeGuard });
```

Every `POST` (Maximo writes are all `POST`) to an origin is then checked with `LicenseStore.authorize` unless the host
says the origin is a test environment. An undeclared origin (`null`) cannot be written to; without `environmentOf`,
every origin is treated as production. Refused writes get `403 { error: "write_not_authorized" }` and nothing is sent
upstream. `authorizeWrite(licenses, origin, environment)` is the same check for other code paths.

## EAM intermediate forms (`/eam`)

A system-neutral shape for three things, with the Maximo mapping as the first implementation. This release is the
foundation: types, the object-structure mapping and readers. Writes still go through the commit engine.

| Form | Types | Maximo |
| --- | --- | --- |
| Asset tree | `AssetNode`, `AssetTree` | `MXAPIASSET` (parent = `PARENT`, else `LOCATION`) + `MXAPIOPERLOC` (parent from `LOCHIERARCHY`) |
| Maintenance plans | `MaintenancePlan`, `JobPlan`, `JobTask` | `MXAPIPM` + `MXAPIJOBPLAN` (`JOBTASK`) |
| Work records | `WorkRecord` | `MXAPIWODETAIL` |

IDs are `kind:SITE/CODE` (`asset:BEDFORD/P-100`), so assets, locations, plans and work orders can reference each other.
`readMaximoAssetTree`, `readMaximoPlans` and `readMaximoWorkRecords` use `loadRecords`, so paging, limits and
truncation work as they do for sheets.

## Where the code came from

Moved from MX Stage 0.2.10 (`src/…`). Comments are in Japanese, as in MX Stage.

| MX Stage | Here | Changes |
| --- | --- | --- |
| `app/maximo/{client,query,load,meta,statusPrefs,commit}.ts` | `src/maximo/` | none |
| `app/maximo/valueList.ts` | `src/maximo/valueList.ts` | `ConnectionProvider` is defined here (generic over the host's connection type) |
| `app/commit/{csv,messages}.ts` | `src/commit/` | none |
| `app/commit/reload.ts` | `src/commit/reload.ts` | takes a `ReloadableSheet` instead of the store's `Sheet`; `ParentReplacement` is defined here |
| `app/commit/controller.ts` (`attemptPlan`, `batchSizeOf`, `describePlanError`) | `src/commit/plan.ts` | moved as is; the controller stays in MX Stage |
| `app/license/{client,gate,messages}.ts` | `src/license/` | storage key, endpoints and the built-in test origins can be passed in |
| `shared/{i18n,model,sheet,scope,status}.ts` | `src/` | none |
| `shared/license.ts`, `shared/licenseKeys.ts` | `src/license/key.ts`, `src/license/publicKeys.ts` | none |
| `shared/demo.ts` | `src/demo.ts` | only the reserved IDs/hosts (`isReservedDemoHost`, `demoLangOfConnectionId`, `demoLangOfBaseUrl`) |
| `bridge/{mx,connections,secretBox}.ts` | `src/node/` | `dir` defaults to `stateDir()`; keychain/DPAPI names, reserved rules and the write guard are options |
| `bridge/license.ts` | `src/node/licenseStore.ts` | `dir` defaults to `stateDir()` |
| `demo/fakeMaximo.ts` | `src/testing/fakeMaximo.ts` | none |

The tests for these modules were copied from MX Stage (`tests/app/maximo-*.test.ts`, `i18n.test.ts`,
`tests/bridge/{mx,connections,license}.test.ts` without the parts that need MX Stage's bridge server) and extended for
the new options.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run build && npm run check:exports
npm pack --dry-run
```

Releases to npm are made by a person (`npm publish`); CI only checks that the package builds and packs.
