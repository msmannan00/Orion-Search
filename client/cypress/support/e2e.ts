import 'cypress-axe';
import "./commands";

beforeEach(() => {
    void cy.intercept("POST", "**/api/nexus/chat/clear-session", {
        statusCode: 200,
        body: { cleared: true },
    }).as("clearNexusSession");
});

if (Cypress.expose("coverage")) {

    require("@cypress/code-coverage/support");
}

Cypress.on("window:before:load", (win) => {
    const doc = win.document;
    const originalDocumentGetAnimations = win.Document.prototype.getAnimations?.bind(doc);
    const forceInstantBehavior = <T extends ScrollIntoViewOptions | ScrollToOptions>(options?: T): T | undefined => (
        options ? { ...options, behavior: "auto" } : undefined
    );

    const originalAnimate = win.Element.prototype.animate;
    win.Element.prototype.animate = function (...args: Parameters<typeof originalAnimate>) {
        const animation = originalAnimate.apply(this, args);
        animation.finish();
        return animation;
    };

    const originalScrollIntoView = win.Element.prototype.scrollIntoView;
    win.Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions) {
        const nextArg = typeof arg === "boolean" ? arg : forceInstantBehavior(arg);
        return Reflect.apply(originalScrollIntoView, this, [nextArg]);
    };

    const originalWindowScrollTo = win.scrollTo.bind(win);
    win.scrollTo = ((...args: [ScrollToOptions?] | [number, number]) => {
        if (typeof args[0] === "object") {
            return Reflect.apply(originalWindowScrollTo, win, [forceInstantBehavior(args[0])]);
        }
        return Reflect.apply(originalWindowScrollTo, win, args);
    }) as typeof win.scrollTo;

    const originalElementScrollTo = win.Element.prototype.scrollTo;
    win.Element.prototype.scrollTo = function (...args: [ScrollToOptions?] | [number, number]) {
        if (typeof args[0] === "object") {
            return Reflect.apply(originalElementScrollTo, this, [forceInstantBehavior(args[0])]);
        }
        return Reflect.apply(originalElementScrollTo, this, args);
    };

    if (win.matchMedia) {
        const originalMatchMedia = win.matchMedia.bind(win);
        win.matchMedia = ((query: string) => {
            const result = originalMatchMedia(query);
            if (query.includes("prefers-reduced-motion")) {
                return {
                    ...result,
                    matches: true,
                    media: query,
                };
            }
            return result;
        }) as typeof win.matchMedia;
    }

    let animationFlushQueued = false;
    const stopAllAnimations = () => {
        const getAnimations = originalDocumentGetAnimations as ((options?: { subtree?: boolean }) => Animation[]) | undefined;
        const animations = getAnimations?.({ subtree: true }) ?? [];
        animations.forEach((animation) => {
            try {
                animation.finish();
            }
            catch {
                try {
                    animation.cancel();
                }
                catch {

                }
            }
        });
    };
    const queueAnimationFlush = () => {
        if (animationFlushQueued) {
            return;
        }
        animationFlushQueued = true;
        win.requestAnimationFrame(() => {
            animationFlushQueued = false;
            stopAllAnimations();
        });
    };

    const style = doc.createElement("style");
    style.setAttribute("data-testid", "instant-animations");
    style.innerHTML = `
      html {
        scroll-behavior: auto !important;
      }

      *,
      *::before,
      *::after {
        transition-property: none !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        transition-timing-function: step-start !important;
        transition: none !important;
        animation-name: none !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        animation-timing-function: step-start !important;
        animation-iteration-count: 1 !important;
        animation-fill-mode: both !important;
        animation-play-state: paused !important;
        animation: none !important;
        scroll-behavior: auto !important;
        caret-color: auto !important;
      }

      #dashboard-container,
      [data-testid="dashboard-container"],
      [data-testid="dashboard-body"] {
        overflow-x: hidden !important;
      }

      .notif-stagger-item,
      .alert-card-stagger-item,
      .ui-social-sidebar-platform-row {
        opacity: 1 !important;
        transform: none !important;
      }
    `;
    doc.head.appendChild(style);

    new win.MutationObserver(() => {
        queueAnimationFlush();
    }).observe(doc.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style"],
        childList: true,
        subtree: true,
    });

    doc.addEventListener("DOMContentLoaded", () => {
        stopAllAnimations();
        queueAnimationFlush();
        win.setTimeout(stopAllAnimations, 0);
        win.setTimeout(stopAllAnimations, 50);
        win.setTimeout(stopAllAnimations, 150);
    });
});

beforeEach(() => {
    void cy.intercept('POST', '**/api/get/tenant/node', (req) => {
        req.on('before:response', (res) => {
            if (res.body?.user) {
                res.body.user.demo_tour = true;
            }
        });
    });
});

export {};
