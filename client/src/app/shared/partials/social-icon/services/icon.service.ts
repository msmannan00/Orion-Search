import { Injectable } from '@angular/core';
import { siAboutdotme, siArtstation, siBehance, siBitbucket, siCrowdin, siDeviantart, siDiscord, siDocker, siDribbble, siEnvato, siFacebook, siFlickr, siFoursquare, siGithub, siGitlab, siGravatar, siInstagram, siLastdotfm, siMedium, siNodedotjs, siPatreon, siPinterest, siReddit, siReplit, siSnapchat, siSoundcloud, siSpotify, siSteam, siTelegram, siTiktok, siTumblr, siTwitch, siVimeo, siVk, siWordpress, siX, siYoutube, siDevdotto } from 'simple-icons';
import type { IconOptions } from './model/icon.model';
import { getOwnProperty } from '../../../utils/type-guards.util';

export type { IconOptions } from './model/icon.model';

const iconMap: Record<string, string> = {
  'x': 'x',
  'twitter': 'x',
  'hub': 'docker',
  'docker hub': 'docker',
  'en': 'gravatar',
  'google+': 'googleplus',
  'dev.to': 'devdotto',
  'node.js': 'nodedotjs',
  'last.fm': 'lastdotfm',
  'lastfm': 'lastdotfm',
  'about.me': 'aboutdotme',
  'atlassian bitbucket': 'bitbucket',
  'bitbucket.org': 'bitbucket',
  'tiktok.com': 'tiktok',
  'youtube': 'youtube',
  'youtu.be': 'youtube',
  'allmylinks': 'allmylinks',
  'artstation': 'artstation',
  'audiojungle': 'envato',
  'behance': 'behance',
  'bitbucket': 'bitbucket',
  'cgtrader': 'cgtrader',
  'codepen': 'codepen',
  'crowdin': 'crowdin',
  'deviantart': 'deviantart',
  'discord': 'discord',
  'dribbble': 'dribbble',
  'facebook': 'facebook',
  'flickr': 'flickr',
  'foursquare': 'foursquare',
  'github': 'github',
  'gitlab': 'gitlab',
  'gravatar': 'gravatar',
  'instagram': 'instagram',
  'linkedin': 'linkedin',
  'medium': 'medium',
  'patreon': 'patreon',
  'pinterest': 'pinterest',
  'replit': 'replit',
  'reddit': 'reddit',
  'snapchat': 'snapchat',
  'soundcloud': 'soundcloud',
  'spotify': 'spotify',
  'steam': 'steam',
  'telegram': 'telegram',
  'themeforest': 'envato',
  'tiktok': 'tiktok',
  'tumblr': 'tumblr',
  'twitch': 'twitch',
  'vimeo': 'vimeo',
  'vk': 'vk',
  'wordpress': 'wordpress',
};
const simpleIconPathMap: Record<string, string> = {
  x: siX.path,
  docker: siDocker.path,
  gravatar: siGravatar.path,
  devdotto: siDevdotto.path,
  nodedotjs: siNodedotjs.path,
  lastdotfm: siLastdotfm.path,
  aboutdotme: siAboutdotme.path,
  bitbucket: siBitbucket.path,
  tiktok: siTiktok.path,
  youtube: siYoutube.path,
  artstation: siArtstation.path,
  envato: siEnvato.path,
  behance: siBehance.path,
  crowdin: siCrowdin.path,
  deviantart: siDeviantart.path,
  discord: siDiscord.path,
  dribbble: siDribbble.path,
  facebook: siFacebook.path,
  flickr: siFlickr.path,
  foursquare: siFoursquare.path,
  github: siGithub.path,
  gitlab: siGitlab.path,
  instagram: siInstagram.path,
  medium: siMedium.path,
  patreon: siPatreon.path,
  pinterest: siPinterest.path,
  replit: siReplit.path,
  reddit: siReddit.path,
  snapchat: siSnapchat.path,
  soundcloud: siSoundcloud.path,
  spotify: siSpotify.path,
  steam: siSteam.path,
  telegram: siTelegram.path,
  tumblr: siTumblr.path,
  twitch: siTwitch.path,
  vimeo: siVimeo.path,
  vk: siVk.path,
  wordpress: siWordpress.path,
};
const simpleIconColorMap: Record<string, string> = {
  x: `#${siX.hex}`,
  docker: `#${siDocker.hex}`,
  gravatar: `#${siGravatar.hex}`,
  devdotto: `#${siDevdotto.hex}`,
  nodedotjs: `#${siNodedotjs.hex}`,
  lastdotfm: `#${siLastdotfm.hex}`,
  aboutdotme: `#${siAboutdotme.hex}`,
  bitbucket: `#${siBitbucket.hex}`,
  tiktok: `#${siTiktok.hex}`,
  youtube: `#${siYoutube.hex}`,
  artstation: `#${siArtstation.hex}`,
  envato: `#${siEnvato.hex}`,
  behance: `#${siBehance.hex}`,
  crowdin: `#${siCrowdin.hex}`,
  deviantart: `#${siDeviantart.hex}`,
  discord: `#${siDiscord.hex}`,
  dribbble: `#${siDribbble.hex}`,
  facebook: `#${siFacebook.hex}`,
  flickr: `#${siFlickr.hex}`,
  foursquare: `#${siFoursquare.hex}`,
  github: `#${siGithub.hex}`,
  gitlab: `#${siGitlab.hex}`,
  instagram: `#${siInstagram.hex}`,
  medium: `#${siMedium.hex}`,
  patreon: `#${siPatreon.hex}`,
  pinterest: `#${siPinterest.hex}`,
  replit: `#${siReplit.hex}`,
  reddit: `#${siReddit.hex}`,
  snapchat: `#${siSnapchat.hex}`,
  soundcloud: `#${siSoundcloud.hex}`,
  spotify: `#${siSpotify.hex}`,
  steam: `#${siSteam.hex}`,
  telegram: `#${siTelegram.hex}`,
  tumblr: `#${siTumblr.hex}`,
  twitch: `#${siTwitch.hex}`,
  vimeo: `#${siVimeo.hex}`,
  vk: `#${siVk.hex}`,
  wordpress: `#${siWordpress.hex}`,
};
const fallbackPlatformColorMap: Record<string, string> = {
  allmylinks: '#ef4444',
  cgtrader: '#22c55e',
  codepen: '#111827',
  linkedin: '#0a66c2',
  googleplus: '#db4437',
};

@Injectable({ providedIn: 'root' })
export class IconService {
  private iconCache = new Map<string, string>();

  private getSimpleIconPath(slug: string): string | null {
    const normalizedSlug = slug.replace(/[^a-z0-9]/g, '').toLowerCase();
    if (!normalizedSlug) {
      return null;
    }
    return getOwnProperty(simpleIconPathMap, normalizedSlug) ?? null;
  }

  private buildIconSvg(pathData: string, options: IconOptions): string {
    const fillColor = '#e2e8f0';
    const scale = options.type === 'graph' ? 0.65 : 0.72;
    const offset = (24 - (24 * scale)) / 2;
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="${fillColor}"><g transform="translate(${offset}, ${offset}) scale(${scale})"><path d="${pathData}"></path></g></svg>`;
  }

  private buildFallbackSvg(platformName: string, options: IconOptions): string {
    const firstLetter = platformName.charAt(0).toUpperCase() || '?';
    const fillColor = '#e2e8f0';
    const fontSize = options.type === 'graph' ? 13 : 16;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="${fillColor}">${firstLetter}</text></svg>`;
  }

  getWhiteIconDataUrl(platformName: string, options: IconOptions = { type: 'default' }): Promise<string> {
    const safePlatform = platformName ?? '';
    const cacheKey = `${safePlatform}-${options.type}`;
    const cachedIcon = this.iconCache.get(cacheKey);
    if (cachedIcon !== undefined) {
      return Promise.resolve(cachedIcon);
    }
    const lowerCasePlatform = safePlatform.toLowerCase();
    const slug = getOwnProperty(iconMap, lowerCasePlatform) || lowerCasePlatform.replace(/[\s.]+/g, '');
    const pathData = this.getSimpleIconPath(slug);
    const svgText = pathData
      ? this.buildIconSvg(pathData, options)
      : this.buildFallbackSvg(platformName, options);
    const dataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
    this.iconCache.set(cacheKey, dataUrl);
    return Promise.resolve(dataUrl);
  }

  getPlatformBrandColor(platformName: string): string {
    const lowerCasePlatform = platformName.toLowerCase();
    const slug = getOwnProperty(iconMap, lowerCasePlatform) || lowerCasePlatform.replace(/[\s.]+/g, '');
    const normalizedSlug = slug.replace(/[^a-z0-9]/g, '').toLowerCase();
    const predefinedColor = getOwnProperty(simpleIconColorMap, normalizedSlug) ?? getOwnProperty(fallbackPlatformColorMap, normalizedSlug);
    if (predefinedColor) {
      return predefinedColor;
    }
    return this.generateColorFromText(normalizedSlug || lowerCasePlatform);
  }

  private generateColorFromText(value: string): string {
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 42%)`;
  }
}
