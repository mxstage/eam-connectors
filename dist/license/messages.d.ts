/** 本番ライセンスの説明と購入のページ（作業画面の言語に合わせる） */
export declare const LICENSE_URL: {
    readonly en: "https://mxstage.tsunagi.app/license";
    readonly ja: "https://mxstage.tsunagi.app/ja/license";
};
export declare const licenseMessages: () => import("../i18n.ts").MessagesOf<{
    readonly environment: {
        readonly label: "Environment";
        readonly production: "Production";
        readonly test: "Test";
        readonly productionOption: "Production (committing needs a license)";
        readonly testOption: "Test / development / training / rehearsal (free)";
        readonly required: "Choose whether this Maximo is production or test.";
        readonly help: "Production is the Maximo your organization uses to record day-to-day operations, including a new environment being prepared to replace it (for example, the migration target before go-live). Everything else is test, even if it holds a copy of production data.";
        readonly licensedBy: (org: string) => string;
        readonly licensedLocked: "This URL is in a license key, so it is always production.";
    };
    readonly badge: {
        readonly test: "Test";
        readonly productionLicensed: (org: string) => string;
        readonly productionReadOnly: "Production · read only (no license)";
        readonly undeclared: "Environment not set";
        readonly expiresSoon: (days: number) => string;
    };
    readonly blocker: {
        readonly undeclared: "Choose whether this Maximo is a production or a test environment in Settings before committing.";
        readonly noLicense: (host: string, licensed: readonly string[]) => string;
        readonly expired: (host: string) => string;
        readonly revoked: (host: string) => string;
        readonly unavailable: "The license could not be checked because the bridge did not answer. Commits to production are paused; test environments are not affected.";
    };
    readonly section: {
        readonly title: "License";
        readonly intro: "Committing to a production Maximo needs a license (one license per production environment). Test environments, and loading, Skills and editing in production, are free.";
        readonly pasteLabel: "License key";
        readonly pastePlaceholder: "MXS1.…";
        readonly save: "Add key";
        readonly saving: "Checking…";
        readonly saved: (org: string) => string;
        readonly remove: "Remove";
        readonly removed: "Removed the key.";
        readonly none: "No license keys on this PC.";
        readonly unavailable: "The bridge does not answer, so the license keys cannot be read.";
        readonly buy: "Buy a license";
        readonly org: "Organization";
        readonly hosts: "Production URLs";
        readonly expires: "Expires";
        readonly licenseId: "License ID";
        readonly state: {
            readonly valid: "Valid";
            readonly expired: "Expired";
            readonly revoked: "Revoked";
            readonly invalid: "Cannot be used";
        };
        readonly test: "Test key (payment sandbox)";
        readonly bundled: "Development key (read by the bridge)";
        readonly share: "Share the key with your team as it is: anyone can use it on any PC, as long as they connect to the production URLs in the key.";
    };
    readonly problem: {
        readonly empty: "Paste a license key.";
        readonly too_long: "This is not a license key (too long).";
        readonly format: "This is not a license key. Paste the whole key, starting with MXS1.";
        readonly payload: "The key is damaged. Paste it again from the email.";
        readonly signature: "The key has been changed or is not from MX Stage.";
        readonly unknown_key: "This key was signed by an unknown key. Update MX Stage and try again.";
        readonly test_key: "This is a test key from the payment sandbox. It only works in development.";
        readonly expired: "This key has expired. Paste the renewed key.";
        readonly revoked: "This key has been revoked. Contact mxstage@tsunagi.app.";
        readonly older: "A newer key for the same license is already added.";
        readonly too_many: "Too many keys on this PC. Remove keys you no longer use.";
        readonly unavailable: "The bridge did not answer. Check that MX Stage is running.";
    };
}>;
