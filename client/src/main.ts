import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/pages/app/app.component';
import { bootstrapIconRegistry, BootstrapIconName } from './app/shared/icons/bootstrap-icon-registry';
import { getOwnProperty } from './app/shared/utils/type-guards.util';

const PLACEHOLDER_SRC = '/assets/images/shared/placeholder.svg';
const AUTH_FRAME_SRC = '/assets/images/shared/auth_dashboard_frame_base.svg';
const AUTH_DASHBOARD_SRC = '/assets/images/shared/auth_dashboard_map.png';
const SEARCH_LOGO_SRC = '/assets/images/shared/logo-wide-light.svg';
const DEFAULT_DASHBOARD_LOGO_SRC = '/api/s/static/system/logo_wide_dark_default.png';
const preloadImageHref = (href: string) => {
    if (document.head.querySelector(`link[rel="preload"][as="image"][href="${href}"]`)) {
        return;
    }
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    document.head.prepend(link);
};
const preload = document.createElement('link');
preload.rel = 'preload';
preload.as = 'image';
preload.href = PLACEHOLDER_SRC;
document.head.prepend(preload);
preloadImageHref(AUTH_FRAME_SRC);
preloadImageHref(AUTH_DASHBOARD_SRC);
const preloadSearchLogo = document.createElement('link');
preloadSearchLogo.rel = 'preload';
preloadSearchLogo.as = 'image';
preloadSearchLogo.href = SEARCH_LOGO_SRC;
document.head.prepend(preloadSearchLogo);
preloadImageHref(DEFAULT_DASHBOARD_LOGO_SRC);
const preloadPlaceholder = new Image();
preloadPlaceholder.src = PLACEHOLDER_SRC;
const preloadAuthFrame = new Image();
preloadAuthFrame.src = AUTH_FRAME_SRC;
const preloadAuthDashboard = new Image();
preloadAuthDashboard.src = AUTH_DASHBOARD_SRC;
const preloadSearch = new Image();
preloadSearch.src = SEARCH_LOGO_SRC;
const preloadDashboardLogo = new Image();
preloadDashboardLogo.src = DEFAULT_DASHBOARD_LOGO_SRC;
const bootstrapIconClassPattern = /(?:^|\s)(bi-[A-Za-z0-9-]+)(?=\s|$)/;
const getBootstrapIconName = (element: Element): BootstrapIconName | null => {
    const className = element.getAttribute('class') ?? '';
    const match = className.match(bootstrapIconClassPattern);
    if (!match) {
        return null;
    }
    const iconName = match[1] as BootstrapIconName;
    return iconName in bootstrapIconRegistry ? iconName : null;
};
const buildBootstrapSvgElement = (iconName: BootstrapIconName): SVGSVGElement => {
    const icon = getOwnProperty(bootstrapIconRegistry, iconName);
    const parser = new DOMParser();
    const parsed = parser.parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${icon.markup}</svg>`,
        'image/svg+xml'
    );
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ui-bootstrap-icon');
    svg.setAttribute('viewBox', icon.viewBox);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    Array.from(parsed.documentElement.childNodes).forEach((childNode) => {
        svg.appendChild(document.importNode(childNode, true));
    });
    return svg;
};
const renderBootstrapIcon = (element: Element) => {
    const iconName = getBootstrapIconName(element);
    if (!iconName) {
        if (element.getAttribute('data-bootstrap-icon-rendered') === '1') {
            element.textContent = '';
            element.removeAttribute('data-bootstrap-icon-rendered');
            element.removeAttribute('data-bootstrap-icon-name');
        }
        return;
    }
    if (element.getAttribute('data-bootstrap-icon-name') === iconName) {
        return;
    }
    element.replaceChildren(buildBootstrapSvgElement(iconName));
    element.setAttribute('data-bootstrap-icon-rendered', '1');
    element.setAttribute('data-bootstrap-icon-name', iconName);
};
const hydrateBootstrapIcons = (root: ParentNode | Element = document) => {
    if (root instanceof Element) {
        renderBootstrapIcon(root);
    }
    root.querySelectorAll('.bi, [class^="bi-"], [class*=" bi-"]').forEach(renderBootstrapIcon);
};
hydrateBootstrapIcons();
const mark = (img: HTMLImageElement) => {
    if (img.dataset.ph === '1') {
        return;
    }
    const src = img.getAttribute('src') ?? '';
    const alt = (img.getAttribute('alt') ?? '').toLowerCase();
    if (!/images\/(statistics|sidebar)\//.test(src)) {
        return;
    }
    if (alt === 'background' ||
        src.endsWith('Bg.webp') ||
        src.endsWith('hint.svg') ||
        src.endsWith('auth_dashboard_frame_base.svg') ||
        src.endsWith('auth_dashboard_map.png') ||
        src.includes('search_nav_logo.png') ||
        img.classList.contains('auth-wrapper__image')) {
        return;
    }
    img.dataset.ph = '1';
    img.setAttribute('data-ph', '');
    const onload = () => { img.removeAttribute('data-ph'); };
    img.addEventListener('load', onload, { once: true });
};
Array.from(document.images).forEach(i => { mark(i); });
new MutationObserver(ms => {
    for (const m of ms) {
        if (m.type === 'childList') {
            m.addedNodes.forEach(n => {
                if (n instanceof HTMLImageElement) {
                    mark(n);
                }
                else if (n instanceof Element) {
                    n.querySelectorAll('img').forEach(i => { mark(i); });
                    hydrateBootstrapIcons(n);
                }
            });
        }
        else if (m.type === 'attributes' && m.target instanceof HTMLImageElement && m.attributeName === 'src') {
            mark(m.target);
        }
    }
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
new MutationObserver(ms => {
    for (const m of ms) {
        if (m.type === 'attributes' && m.attributeName === 'class' && m.target instanceof Element) {
            renderBootstrapIcon(m.target);
        }
        if (m.type === 'childList') {
            m.addedNodes.forEach(n => {
                if (n instanceof Element) {
                    hydrateBootstrapIcons(n);
                }
            });
        }
    }
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

bootstrapApplication(AppComponent, appConfig).then();
