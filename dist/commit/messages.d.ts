export declare const commitEngineMessages: () => import("../i18n.ts").MessagesOf<{
    /** 不変条件違反（CommitInvariantError）の詳細 */
    readonly invariant: {
        readonly duplicateParentKey: (key: string) => string;
        readonly parentNotLoaded: (key: string) => string;
        readonly columnNotInSheet: (name: string) => string;
        readonly invalidColumnAttr: (name: string) => string;
        readonly conflictingParentValues: (attr: string) => string;
        readonly parentAddUnsupported: "New records can only be committed from sheets loaded from Maximo";
        readonly newParentNeedsKeys: "New records need the key columns of the sheet (this sheet has none)";
        readonly newParentKeyMissing: (col: string) => string;
        readonly createWithHref: (key: string) => string;
        readonly createNeedsOs: (key: string) => string;
        readonly createNotPost: "Not a create request (POST to the object structure without x-method-override)";
        readonly addedRowParentMismatch: (rowKey: string) => string;
        readonly addedRowKeyShape: (rowKey: string, prefix: string) => string;
        readonly duplicateAddedRowKey: "Added rows have duplicate row keys";
        readonly parentDeleteUnsupported: "Deleting parent rows is not supported";
        readonly childColumnOnOtherRow: (name: string, child: string) => string;
        readonly newChildNotAdded: (rowKey: string) => string;
        readonly readOnlyColumn: (name: string) => string;
        readonly childIdAttrChanged: (name: string) => string;
        readonly conflictingCellValues: (name: string) => string;
        readonly childNotInSheet: (kind: string) => string;
        readonly addedRowParentValue: (rowKey: string, name: string) => string;
        readonly addedRowOtherChildColumn: (rowKey: string, name: string) => string;
        readonly addedChildWithId: (name: string) => string;
        readonly addedRowNoAttrs: (rowKey: string) => string;
        readonly parentNullNeedsAllow: (attr: string) => string;
        readonly childNullNeedsAllow: (kind: string, attr: string) => string;
        readonly parentDeletesOverLimit: (key: string, count: number, limit: number) => string;
        readonly totalDeletesOverLimit: (count: number, limit: number) => string;
        readonly childNotLoaded: (kind: string) => string;
        readonly childRowKeyNoId: (kind: string) => string;
        readonly childIdNotLoaded: (kind: string) => string;
        readonly keyColumnChanged: (name: string) => string;
        readonly hrefMissing: "No href from loading";
        readonly hrefQuery: "The href contains a query or fragment";
        readonly hrefNotUrl: "The href is not a URL";
        readonly tooManyParents: (max: number, count: number) => string;
        readonly duplicatePlan: (key: string) => string;
        readonly duplicateHref: (key: string) => string;
        readonly invalidAttrName: (name: string) => string;
        readonly invalidChildName: (kind: string) => string;
        readonly emptyChildArray: (kind: string) => string;
        readonly childIdUnknown: (kind: string) => string;
        readonly opIdNotLoaded: (kind: string, action: string) => string;
        readonly childIdAttrMismatch: (kind: string) => string;
        readonly opNoAttrs: (kind: string, action: string) => string;
        readonly opIdAsAttr: (kind: string, action: string) => string;
        readonly planParentDeletesOverLimit: (key: string, limit: number) => string;
        readonly planTotalDeletesOverLimit: (limit: number) => string;
        readonly invalidTransactionId: "Invalid transactionid";
        readonly childNameCollides: (kind: string) => string;
        readonly notPatch: "Not a PATCH (x-method-override)";
        readonly noMerge: "patchtype: MERGE is missing";
        readonly targetMismatch: "The target does not match the href from loading";
        readonly invalidOs: (os: string) => string;
        readonly hrefNotTarget: (key: string, why: string) => string;
        readonly hrefNotOsRecord: (key: string) => string;
        readonly hrefNotSheetOsRecord: (key: string, os: string) => string;
        readonly duplicateTransactionId: "Duplicate transactionid in the same run";
        readonly statusHistoryChild: (kind: string) => string;
        readonly statusEmpty: "The status cannot be cleared";
        readonly irreversibleStatus: (count: number, values: string) => string;
        readonly statusAsAttr: (parentKey: string) => string;
    };
    /** 行ごとの結果（CommitRowResult.message） */
    readonly row: {
        readonly onRowFailed: "Not sent: reporting the result (onRow) failed";
        readonly previousFailed: "Not sent because a previous row failed";
        readonly canaryStopped: "Not sent: stopped after checking the first row";
        readonly precheckFailed: (why: string) => string;
        readonly duplicateTransaction: "409 (duplicate transactionid)";
        readonly alreadyExists: "Not sent: a record with this key already exists in Maximo (load it instead of creating it)";
        readonly createdNotFound: (n: number) => string;
        readonly unreadableResponse: (status: number) => string;
        readonly timeout: "Timed out";
        readonly networkError: "Network error";
        readonly stoppedBeforeSend: (why: string) => string;
        readonly verifyFailed: (why: string) => string;
        readonly verifyMismatch: (items: string) => string;
        readonly reconcileReadFailed: (cause: string, why: string) => string;
        readonly reconcileLooksApplied: (cause: string) => string;
        readonly reconcileVerified: (cause: string) => string;
        readonly reconcileNotApplied: (cause: string, items: string) => string;
        readonly noRowstamp: "Not sent: there is no _rowstamp from loading, so updates by others cannot be detected";
        readonly parentUpdated: "Not sent: the parent record was updated in Maximo after loading (_rowstamp differs)";
        readonly childSetChanged: (kind: string) => string;
        readonly childRowstampMissing: (kind: string) => string;
        readonly childGone: (kind: string) => string;
        readonly childUpdated: (kind: string) => string;
        readonly historyRecord: (status: string) => string;
        readonly poNeedsRevision: (status: string) => string;
        readonly statusTransition: (from: string, to: string) => string;
        readonly createdButStatus: (to: string, why: string) => string;
        readonly changedButStatus: (to: string, why: string) => string;
        readonly statusLooksApplied: (to: string) => string;
        readonly statusNotApplied: (to: string, got: string) => string;
    };
    /** 読み直した結果が計画と合わない項目（名前だけ。値は入れない） */
    readonly mismatch: {
        readonly changedChildMissing: (kind: string) => string;
        readonly deleteNotApplied: (kind: string) => string;
        readonly unchangedChildGone: (kind: string) => string;
        readonly addNotApplied: (kind: string) => string;
        readonly unexpectedChild: (kind: string) => string;
        readonly childCountMismatch: (kind: string) => string;
    };
    readonly unknownError: "Unknown error";
}>;
export declare const commitMessages: () => import("../i18n.ts").MessagesOf<{
    readonly unknownError: "Unknown error";
    /** 名前を上限まで並べた後の残り（列） */
    readonly moreColumns: (shown: string, rest: number) => string;
    /** 反映できない理由（blockers） */
    readonly blocker: {
        readonly notConnected: "Not connected to Maximo. Connect in Settings on the work screen.";
        readonly noChanges: "There are no changes to commit.";
        readonly notMaximoSheet: "This sheet was not loaded from Maximo, so it cannot be committed.";
        readonly sheetMissing: (sheet: string) => string;
        readonly otherConnection: (sheetBaseUrl: string, currentBaseUrl: string) => string;
        /** 食い違いの一覧（3 件まで並べ、残りは件数） */
        readonly problemList: (shown: readonly string[], rest: number) => string;
        readonly structureChanged: (os: string, listed: string) => string;
        readonly parentRowsDeleted: (parentKey: string, columns: string) => string;
        readonly moreParentRowsDeleted: (count: number) => string;
    };
    /** 計画を作れなかったときに、利用者が次にできること（不変条件ごと） */
    readonly advice: {
        readonly parentAdd: "New records can only be committed from a sheet loaded from Maximo. Undo the added parent rows.";
        readonly newParentKeys: "Fill the key columns (for example SITEID and ASSETNUM) of every new record, or undo the added rows.";
        readonly parentDelete: "Deleting parents (Maximo records) cannot be committed. Undo the deletion.";
        readonly unknownParent: "A parent row that was not there when the sheet was loaded has been changed. Reload the sheet.";
        readonly conflictingParentValues: "Rows of the same parent have different values in a parent column. Make them the same.";
        readonly addedParentMismatch: "A parent column in an added row differs from the parent's value. Change parent columns on the parent row.";
        readonly statusEmpty: "A status was cleared. Enter a status, or undo the change.";
        readonly statusHistoryChild: "The status history (such as WOSTATUS) cannot be changed. Change the STATUS column of the record instead, and undo the changes to the history rows.";
        readonly input: "This combination of changes cannot be committed. Review the changes on the work screen.";
        readonly I2: "The changes do not match the child records from loading (children with an unknown ID cannot be changed or deleted). Reload the sheet.";
        readonly I3: (perParent: number, total: number) => string;
        readonly I4: "Added rows cannot include the child ID column. Clear that value.";
        readonly I5: "Columns that cannot be changed (read-only, key or child ID columns) were changed. Undo those changes.";
        readonly I6: "Some rows have no values to send. Enter values, or undo adding those rows.";
        readonly I7: "The URL (href) loaded from Maximo cannot be used. Reload the sheet.";
        readonly I8: (max: number) => string;
        readonly I10: "Some changes clear values (null). Confirm that clearing them is OK, then run again.";
        readonly I11: "Some records change to a status that cannot be undone (such as closed or cancelled). Confirm the statuses, then run again.";
        readonly I12: "The status was about to be sent as an ordinary value. Reload the sheet and set the status again.";
        readonly other: "The commit plan could not be built. Review the changes on the work screen.";
        /** 利用者向けの文に、内部コードと詳細を括弧で添える */
        readonly withDetail: (advice: string, code: string, detail: string) => string;
        readonly planFailed: (why: string) => string;
    };
    /** run が実行しなかった理由・中止 */
    readonly run: {
        readonly alreadyRunning: "This sheet is being committed. Try again when it finishes.";
        readonly blockedPrefix: "Not run because some issues prevent committing: ";
        readonly needsNullConfirm: "Some changes clear values (null). Confirm that clearing them is OK, then run again.";
        readonly needsIrreversibleConfirm: "Some records change to a status that cannot be undone (such as closed or cancelled). Confirm the statuses, then run again.";
        readonly needsDeleteConfirm: "The number of deletions is over the limit. Confirm the deletions, then run again.";
        readonly planFailedPrefix: "Not run because the commit plan could not be built: ";
        readonly cancelled: "Cancelled. Rows already sent were not rolled back.";
        readonly cancelledRow: "Not sent because the commit was cancelled";
        readonly precheckStopped: (why: string) => string;
        readonly remaining: (n: number) => string;
    };
    /** 反映を確かめた親の、作業画面の値の置き換えについての注記 */
    readonly note: {
        readonly sheetReplaced: "Commit verified, but the sheet was reloaded, so the values on the work screen were not replaced";
        readonly changedSince: "Commit verified, but the work screen changed during the commit, so its values were not replaced (reload needed)";
        readonly invalidRows: "Commit verified, but the rows read back did not fit the sheet, so the values on the work screen were not replaced";
        readonly reloadFailed: (why: string) => string;
        readonly kept: (why: string) => string;
        readonly updateFailed: (why: string) => string;
        readonly statusKept: "The record was created, but its status could not be changed. Commit again to send only the status change";
        /** 行の結果の文に注記を足す */
        readonly append: (message: string, note: string) => string;
    };
    /** 読み直しに失敗した理由（note.kept の中に入る） */
    readonly reload: {
        readonly parentNotFound: "the parent record from loading was not found";
        readonly readFailed: (why: string) => string;
        readonly keyMismatch: "the key column values read back do not match";
        readonly rowsInvalid: (why: string) => string;
    };
    /** シートを読み込んだ後の、オブジェクト構造の定義の食い違い */
    readonly drift: {
        readonly columnRemoved: (name: string) => string;
        readonly columnReadOnly: (name: string) => string;
        readonly columnType: (name: string, from: string, to: string) => string;
        readonly columnLength: (name: string, from: number, to: number) => string;
        readonly childRemoved: (child: string) => string;
        readonly childIdAttr: (child: string, from: string, to: string) => string;
        readonly unknown: "unknown";
        readonly keyColumns: (from: string, to: string) => string;
    };
    /** [Maximo に反映] を押せない理由 */
    readonly button: {
        readonly noSheet: "There is no sheet.";
        readonly running: "Commit in progress.";
        readonly awaitingCanary: "Check the result of the first row.";
        readonly locked: "The Maximo connection is locked. Reconnect in Settings.";
        readonly notConnected: "Not connected to Maximo. Connect in Settings.";
        readonly blocked: "Some issues prevent committing.";
        readonly noChanges: "There are no changes to commit.";
    };
    /** 確認ダイアログの件数 */
    readonly confirmLine: {
        readonly sheet: (sheet: string) => string;
        readonly parents: (n: number) => string;
        readonly changedCells: (n: number) => string;
        readonly addedRows: (n: number) => string;
        readonly newRecords: (n: number) => string;
        readonly statusChanges: (n: number, detail: string) => string;
        readonly deletedRows: (n: number) => string;
    };
    readonly state: {
        readonly idle: "Not committed";
        readonly requested: "Commit requested";
        readonly running: "Committing";
        readonly done: "Done";
        readonly failed: "Some rows failed";
    };
    readonly resultStatus: {
        readonly verified: "Committed (verified by reading back)";
        readonly conflict: "Conflict (changed elsewhere)";
        readonly error: "Error";
        readonly unknown: "Unknown (check in Maximo)";
        readonly skipped: "Not sent";
    };
    /** 結果の件数の要約（例「3 committed, 1 error」） */
    readonly resultCount: {
        readonly verified: (n: number) => string;
        readonly conflict: (n: number) => string;
        readonly error: (n: number) => string;
        readonly unknown: (n: number) => string;
        readonly skipped: (n: number) => string;
    };
    readonly resultSeparator: ", ";
    /** run の後に利用者へ見せる文 */
    readonly outcome: {
        readonly alreadyRunning: "A commit is already in progress.";
        readonly notCommittedBecause: (why: string) => string;
        readonly notCommitted: "Not committed.";
        readonly finishedWith: (summary: string) => string;
        readonly finished: "Commit finished.";
        readonly withMessage: (done: string, message: string) => string;
    };
    readonly panel: {
        readonly title: "Commit";
        readonly nothingToCommit: "There are no changes to commit.";
        readonly targetTitle: "Commits to the object structure and connection the sheet was loaded from";
        readonly requestTitle: "Review the changes before committing.";
        readonly requested: "The AI has requested a commit";
        readonly dismissRequest: "Dismiss request";
        readonly counts: {
            readonly parents: "Records";
            readonly changedCells: "Changed cells";
            readonly addedRows: "Added rows";
            readonly newRecords: "New records";
            readonly statusChanges: "Status changes";
            readonly deletedRows: "Deleted rows";
        };
        readonly batchLegend: "Records per commit";
        readonly batchAll: "All";
        readonly batchCount: "Set a number";
        readonly batchCountLabel: "Records per commit (number)";
        readonly batchLine: (sending: number, total: number) => string;
        readonly commitButton: "Commit to Maximo";
        readonly status: (label: string) => string;
        readonly writeLog: "Write log (CSV)";
        readonly cancelCommit: "Cancel commit";
        readonly results: (summary: string) => string;
        readonly resultsTruncated: (n: number) => string;
        readonly confirmTitle: "Commit to Maximo?";
        readonly confirmCancel: "Cancel";
        readonly confirmCommit: "Commit";
        readonly canaryNote: "After the first row is sent, you check its result before the rest are sent. Nothing is retried automatically.";
        readonly confirmDeletes: (n: number) => string;
        readonly confirmNulls: "I confirm this includes changes to empty (null)";
        readonly confirmIrreversible: (n: number, values: string) => string;
        readonly canaryTitle: "Result of the first row";
        readonly canaryStop: "Stop";
        readonly canaryContinue: "Continue";
        readonly canaryCheck: "Check the result in Maximo, then decide whether to send the rest.";
        readonly runFailed: (why: string) => string;
        readonly cancelling: "Cancelling the commit. Rows already sent are not rolled back.";
        readonly cancelFailed: (why: string) => string;
    };
}>;
