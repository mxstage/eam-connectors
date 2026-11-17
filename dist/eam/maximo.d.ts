import type { TypedFilter } from "../model.ts";
import type { MaximoRecord } from "../sheet.ts";
import type { MaximoClient } from "../maximo/client.ts";
import { type LoadRecordsOptions } from "../maximo/load.ts";
import { type AssetNode, type AssetTree, type JobPlan, type MaintenancePlan, type WorkRecord } from "./types.ts";
/** 1 つのオブジェクト構造から何を読むか */
export interface MaximoEamSource {
    os: string;
    /** 親の属性と子の属性（CHILD.ATTR） */
    select: readonly string[];
    keyColumns: readonly string[];
    childIdAttrs: Readonly<Record<string, string | null>>;
}
export declare const MAXIMO_EAM_SOURCES: {
    readonly asset: {
        readonly os: "MXAPIASSET";
        readonly select: readonly ["ASSETNUM", "SITEID", "DESCRIPTION", "STATUS", "PARENT", "LOCATION", "ASSETTYPE"];
        readonly keyColumns: readonly ["ASSETNUM", "SITEID"];
        readonly childIdAttrs: {};
    };
    readonly location: {
        readonly os: "MXAPIOPERLOC";
        readonly select: readonly ["LOCATION", "SITEID", "DESCRIPTION", "STATUS", "TYPE", "LOCHIERARCHY.PARENT", "LOCHIERARCHY.SYSTEMID"];
        readonly keyColumns: readonly ["LOCATION", "SITEID"];
        readonly childIdAttrs: {
            readonly LOCHIERARCHY: "SYSTEMID";
        };
    };
    readonly pm: {
        readonly os: "MXAPIPM";
        readonly select: readonly ["PMNUM", "SITEID", "DESCRIPTION", "STATUS", "ASSETNUM", "LOCATION", "JPNUM", "FREQUENCY", "FREQUNIT", "NEXTDATE"];
        readonly keyColumns: readonly ["PMNUM", "SITEID"];
        readonly childIdAttrs: {};
    };
    readonly jobPlan: {
        readonly os: "MXAPIJOBPLAN";
        readonly select: readonly ["JPNUM", "SITEID", "DESCRIPTION", "STATUS", "PLUSCREVNUM", "JOBTASK.JPTASK", "JOBTASK.DESCRIPTION", "JOBTASK.TASKDURATION"];
        readonly keyColumns: readonly ["JPNUM"];
        readonly childIdAttrs: {
            readonly JOBTASK: "JPTASK";
        };
    };
    readonly work: {
        readonly os: "MXAPIWODETAIL";
        readonly select: readonly ["WONUM", "SITEID", "DESCRIPTION", "STATUS", "WORKTYPE", "ASSETNUM", "LOCATION", "PMNUM", "JPNUM", "SCHEDSTART", "ACTSTART", "ACTFINISH", "ACTLABHRS"];
        readonly keyColumns: readonly ["WONUM", "SITEID"];
        readonly childIdAttrs: {};
    };
};
export type MaximoEamKind = keyof typeof MAXIMO_EAM_SOURCES;
/** loadRecords に渡す形にする（where・orderBy・件数は呼ぶ側が決める） */
export declare function maximoLoadOptions(kind: MaximoEamKind, opts?: {
    where?: TypedFilter[];
    orderBy?: string[];
    maxRows?: number;
    signal?: AbortSignal;
}): LoadRecordsOptions;
/** MXAPIASSET の 1 件 → 資産の節（親は PARENT の資産、無ければ設置場所） */
export declare function assetFromMaximo(rec: MaximoRecord): AssetNode;
/** MXAPIOPERLOC の 1 件 → 場所の節。親は LOCHIERARCHY の PARENT（systemId を渡せばその階層、省けば最初の階層） */
export declare function locationFromMaximo(rec: MaximoRecord, systemId?: string): AssetNode;
/** 節を木にする。親が木に無い節は根にする。親をたどって輪になる節も根にする */
export declare function buildAssetTree(nodes: Iterable<AssetNode>): AssetTree;
/** MXAPIPM の 1 件 → 保全計画（対象は資産、無ければ場所） */
export declare function planFromMaximo(rec: MaximoRecord): MaintenancePlan;
/** MXAPIJOBPLAN の 1 件 → 作業の手順（JOBTASK を手順の番号の順に） */
export declare function jobPlanFromMaximo(rec: MaximoRecord): JobPlan;
/** MXAPIWODETAIL の 1 件 → 作業の実績 */
export declare function workRecordFromMaximo(rec: MaximoRecord): WorkRecord;
export interface MaximoEamReadOptions {
    where?: TypedFilter[];
    maxRows?: number;
    signal?: AbortSignal;
}
/** 資産と場所を読んで木にする。truncated はどちらかを打ち切ったとき */
export declare function readMaximoAssetTree(client: MaximoClient, opts?: MaximoEamReadOptions & {
    locationWhere?: TypedFilter[];
}): Promise<{
    tree: AssetTree;
    truncated: boolean;
}>;
/** 保全計画と、そこから使う作業の手順を読む */
export declare function readMaximoPlans(client: MaximoClient, opts?: MaximoEamReadOptions): Promise<{
    plans: MaintenancePlan[];
    jobPlans: JobPlan[];
    truncated: boolean;
}>;
/** 作業の実績を読む */
export declare function readMaximoWorkRecords(client: MaximoClient, opts?: MaximoEamReadOptions): Promise<{
    records: WorkRecord[];
    truncated: boolean;
}>;
