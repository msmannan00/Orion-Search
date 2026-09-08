import { defineConfig } from "cypress";
import registerCodeCoverageTasks from "@cypress/code-coverage/task";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const isCi =
    process.env["CI"] === "true" ||
    process.env["GITHUB_ACTIONS"] === "true" ||
    process.env["GITLAB_CI"] === "true";
const coverageEnabled = isCi || process.env["ORION_COVERAGE"] === "true";
const commandTimeout = Number(process.env["CYPRESS_COMMAND_TIMEOUT"]) || 60000;

const isUnpackedExtension = (candidate: string) =>
    fs.existsSync(path.join(candidate, "manifest.json"));

const latestSiblingExtensionBuild = (root: string): string | null => {
    if (!fs.existsSync(root)) {
        return null;
    }
    const builds = fs
        .readdirSync(root)
        .filter((name) => name.startsWith("build-"))
        .map((name) => path.join(root, name, "orion-extension-chrome-dev"))
        .filter(isUnpackedExtension)
        .sort((first, second) => fs.statSync(second).mtimeMs - fs.statSync(first).mtimeMs);
    return builds[0] ?? null;
};

const unpackCrx = (crxPath: string, outDir: string): string | null => {
    const buffer = fs.readFileSync(crxPath);
    if (buffer.subarray(0, 4).toString("utf8") !== "Cr24") {
        return null;
    }
    const version = buffer.readUInt32LE(4);
    const zipStart = version === 3
        ? 12 + buffer.readUInt32LE(8)
        : 16 + buffer.readUInt32LE(8) + buffer.readUInt32LE(12);

    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    const zipPath = path.join(outDir, "extension.zip");
    fs.writeFileSync(zipPath, buffer.subarray(zipStart));
    execFileSync("unzip", ["-oq", zipPath, "-d", outDir]);
    fs.unlinkSync(zipPath);
    return isUnpackedExtension(outDir) ? outDir : null;
};

const resolveOrionExtensionPath = (projectRoot: string): string | null => {
    const explicit = process.env["ORION_EXTENSION_PATH"];
    if (explicit) {
        return isUnpackedExtension(explicit) ? explicit : null;
    }

    const siblingRoot = process.env["ORION_EXTENSION_ROOT"] ?? path.resolve(projectRoot, "..", "..", "orion-extension");
    const unpacked = latestSiblingExtensionBuild(siblingRoot);
    if (unpacked) {
        return unpacked;
    }

    if (!fs.existsSync(siblingRoot)) {
        return null;
    }
    const crx = fs
        .readdirSync(siblingRoot)
        .filter((name) => name.startsWith("build-"))
        .flatMap((name) => {
            const dir = path.join(siblingRoot, name);
            return fs.readdirSync(dir).filter((f) => f.endsWith(".crx")).map((f) => path.join(dir, f));
        })
        .sort((first, second) => fs.statSync(second).mtimeMs - fs.statSync(first).mtimeMs)[0];
    if (!crx) {
        return null;
    }
    try {
        return unpackCrx(crx, path.join(projectRoot, "cypress", "downloads", "orion-extension-unpacked"));
    } catch {
        return null;
    }
};

export default defineConfig({
    allowCypressEnv: false,
    video: false,
    screenshotsFolder: "cypress/error",
    screenshotOnRunFailure: true,
    numTestsKeptInMemory: 0,
    watchForFileChanges: false,
    trashAssetsBeforeRuns: false,
    experimentalMemoryManagement: true,
    experimentalFastVisibility: true,
    retries: 0,
    env: {
        coverage: coverageEnabled,
        language: "en",
        codeCoverage: {
            enabled: coverageEnabled,
        },
        pgp: false,
        ADMIN_USERNAME: "admin_test_username",
        ADMIN_PASSWORD: "Zq9M#rX@e7W^B0T+f(ysG!kJc1d2mC&N%hAUEP)6Y4n$R8VbHS",
        DEMO_USERNAME: "demo",
        DEMO_PASSWORD: "T@YdycoDuU9U6N6f2B7N8GsxpG3AkkSaOrlX8WBOwJgke3UNYCjgd3owwObGdPrsw",
        TEST_USERS: {
            testing1: { username: "testing1", email: "a@hotmail.com", password: "1qaz!QAZ", role: "Member", licenses: ["Free"] },
            testing2: { username: "testing2", email: "b@hotmail.com", password: "1qaz!QAZ", role: "Analyst", licenses: ["Free", "OSINT Basic"] },
            testing3: { username: "testing3", email: "c@hotmail.com", password: "1qaz!QAZ", role: "Member", licenses: ["Free", "OSINT Advanced"] },
            testing4: { username: "testing4", email: "d@gmail.com", password: "1qaz!QAZ", role: "Member", licenses: ["Free", "Pentester"] },
            testing5: { username: 'testing5', email: 'e@hotmail.com', password: '1qaz!QAZ', role: 'Demo', licenses: ['Free']},
            testing6: { username: "testing6", email: "feeder1@samplemail.test", password: "1qaz!QAZ", role: "Member", licenses: ["Feeder"] },
            testing7: { username: "testing7", email: "feeder2@samplemail.test", password: "1qaz!QAZ", role: "Analyst", licenses: ["Feeder"], permissions: ["case_management"] },
        },
        DEFAULT_TEST_USER_KEY: "testing5",
        RESET_PASSWORD_EMAIL: "d@hotmail.com",
        NEW_PASSWORD: "NewSecurePass@2026",
        TENANT_ACCOUNT: {
            username: "test_for_tenants",
            email: "testing1@orionintelligence.org",
            password: "1qaz!QAZ",
            slug: "orionintelligence",
        },
        TENANT_SUB_USER: {
            username: "tenant_user_1",
            email: "tenant1@gmail.com",
            password: "1qaz!QAZ",
        },
        CASE_ALERT_TENANTS: [
            {
                username: "dcasealert1",
                email: "dcasealert1@dcaseorionintelligence.org",
                password: "1qaz!QAZ",
                companyName: "Case Alert Tenant One",
                slug: "dcaseorionintelligence",
            },
            {
                username: "ecasealert2",
                email: "ecasealert2@ecaseorionintelligence.org",
                password: "1qaz!QAZ",
                companyName: "Case Alert Tenant Two",
                slug: "ecaseorionintelligence",
            },
            {
                username: "fcasealert3",
                email: "fcasealert3@fcaseorionintelligence.org",
                password: "1qaz!QAZ",
                companyName: "Case Alert Tenant Three",
                slug: "fcaseorionintelligence",
            },
        ],
        CASE_ALERT_USERS: {
            limited: {
                username: "case_alert_user1",
                email: "case.alert.user1@samplemail.test",
                password: "1qaz!QAZ",
                role: "Analyst",
                licenses: ["Free"],
                permissions: ["case_management"],
                alertAllowedTenants: ["Case Alert Tenant One", "Case Alert Tenant Two"],
            },
            all: {
                username: "case_alert_user2",
                email: "case.alert.user2@samplemail.test",
                password: "1qaz!QAZ",
                role: "Analyst",
                licenses: ["Free"],
                permissions: ["case_management"],
                alertAllowedTenants: "all",
            },
        },
        DISMISS_RESULT_USER: {
            username: "dismiss_result_user1",
            email: "dismiss.result.user1@samplemail.test",
            password: "1qaz!QAZ",
            role: "Analyst",
            licenses: ["Enterprise"],
            permissions: ["dismiss_result"],
        },
        TEST_DATA: {
            stealer_ioc_email: "nora.keen@samplemail.test",
            stealer_upgrade_name: "Avery Stone",
            stealer_upgrade_email: "avery.stone@samplemail.test",
            cti_social_username: "orion_demo_actor",
            filter_email: "filters.runner@samplemail.test",
            consolidated_ioc_email: "mila.frost@samplemail.test",
            consolidated_advanced_email: "kai.rivera@samplemail.test",
            consolidated_domain_query: "inbox.test",
            scans_email_breach: "elena.pierce@samplemail.test",
            scans_social_username: "atlasnode",
            scans_wanted_name: "Mason Hale",
            support_email: "support.agent@samplemail.test",
            alert_slack_client_id: "111111111111.222222222222",
        },
        field_types: [
            "Single-line text input",
            "Multi-line text input",
            "Selection box",
            "Multiple choice input",
            "Checkbox",
            "Attachment",
            "Terms of service",
            "Date",
            "Date range",
            "Voice",
            "Group of questions",
        ],
        takeScreenshots: false,
    },
    expose: {
        coverage: coverageEnabled,
        TEST_DATA: {
            stealer_ioc_email: "nora.keen@samplemail.test",
            stealer_upgrade_name: "Avery Stone",
            stealer_upgrade_email: "avery.stone@samplemail.test",
            cti_social_username: "orion_demo_actor",
            filter_email: "filters.runner@samplemail.test",
            consolidated_ioc_email: "mila.frost@samplemail.test",
            consolidated_advanced_email: "kai.rivera@samplemail.test",
            consolidated_domain_query: "inbox.test",
            scans_email_breach: "elena.pierce@samplemail.test",
            scans_social_username: "atlasnode",
            scans_wanted_name: "Mason Hale",
            support_email: "support.agent@samplemail.test",
            alert_slack_client_id: "111111111111.222222222222",
        },
    },
    e2e: {
        specPattern: "cypress/e2e/**/*.{cy,spec}.{ts,js}",
        supportFile: "cypress/support/e2e.ts",
        testIsolation: true,
        setupNodeEvents(on, config) {
            const takeScreenshots = config.env["takeScreenshots"];
            if (takeScreenshots === true || takeScreenshots === "true") {
                config.screenshotsFolder = "../docs/screenshots";
            }
            on("after:screenshot", (details) => {
                if (!details.testFailure) {
                    return;
                }
                const screenshotsFolder =
                    typeof config.screenshotsFolder === "string" ? config.screenshotsFolder : "cypress/error";
                const screenshotRoot = path.resolve(config.projectRoot, screenshotsFolder);
                const relativePath = path.relative(screenshotRoot, details.path);
                const targetPath = path.resolve(config.projectRoot, "cypress", "error", relativePath);

                if (details.path === targetPath) {
                    return;
                }

                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                fs.renameSync(details.path, targetPath);

                return { path: targetPath };
            });
            if (coverageEnabled) {
                registerCodeCoverageTasks(on, config);
            }
            const extensionPath = resolveOrionExtensionPath(config.projectRoot);
            const extensionManifest = extensionPath
                ? JSON.parse(fs.readFileSync(path.join(extensionPath, "manifest.json"), "utf8"))
                : null;
            config.env["extensionLoaded"] = extensionPath !== null;
            config.env["extensionPath"] = extensionPath ?? "";
            config.env["extensionName"] = String(extensionManifest?.name ?? "");
            config.env["extensionVersion"] = String(extensionManifest?.version ?? "");
            config.env["extensionManifestVersion"] = Number(extensionManifest?.manifest_version ?? 0);
            on("before:browser:launch", (browser, launchOptions) => {
                if (browser.family === "chromium" && browser.name !== "electron") {
                    launchOptions.args.push("--start-maximized");
                    launchOptions.args.push(`--window-size=${config.viewportWidth},${config.viewportHeight}`);
                    launchOptions.args.push("--force-device-scale-factor=1");
                    if (extensionPath) {
                        launchOptions.extensions.push(extensionPath);
                    }
                }
                if (browser.name === "electron") {
                    launchOptions.preferences.width = config.viewportWidth;
                    launchOptions.preferences.height = config.viewportHeight;
                }
                return launchOptions;
            });
            on("task", {
                log(_) {
                    return null;
                },
                table(_) {
                    return null;
                },
                writeDocScreenshot({ data, name, specName }) {
                    const screenshotsFolder =
                        typeof config.screenshotsFolder === "string" ? config.screenshotsFolder : "cypress/error";
                    const screenshotRoot = path.resolve(config.projectRoot, screenshotsFolder);
                    const safeSpecName = String(specName || "unknown-spec").replace(/[\\/]/g, "_");
                    const safeName = String(name || "screenshot").replace(/\\/g, "/").replace(/^\/+/, "");
                    const targetPath = path.resolve(screenshotRoot, safeSpecName, "user-manual", `${safeName}.png`);

                    if (!targetPath.startsWith(`${screenshotRoot}${path.sep}`)) {
                        throw new Error(`Refusing to write docs screenshot outside screenshots folder: ${targetPath}`);
                    }

                    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                    fs.writeFileSync(targetPath, Buffer.from(String(data), "base64"));
                    return null;
                },
            });
            return config;
        },
        baseUrl: "http://127.0.0.1:4200",
        viewportWidth: 1920,
        viewportHeight: 1080,
        defaultCommandTimeout: commandTimeout,
        requestTimeout: commandTimeout,
        responseTimeout: commandTimeout,
        pageLoadTimeout: 60000,
        execTimeout: commandTimeout,
        taskTimeout: commandTimeout,
        waitForAnimations: true,
        animationDistanceThreshold: 5,
    },
    component: {
        devServer: {
            framework: "angular",
            bundler: "webpack",
        },
        specPattern: "cypress/**/*.cy.ts",
    },
});
