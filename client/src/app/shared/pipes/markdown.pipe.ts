import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';
import { getOwnProperty } from '../utils/type-guards.util';


@Pipe({ name: 'markdown', standalone: true, pure: false })
export class MarkdownPipe implements PipeTransform {
  private readonly translationService = inject(TranslationService);
  private cachedResult = '';
  private cachedValue: string | null = null;
  private cachedVersion = -1;

  transform(value: string | null | undefined): string {
    const normalizedValue = value ?? '';
    const version = this.translationService.version();
    if (normalizedValue === this.cachedValue && version === this.cachedVersion) {
      return this.cachedResult;
    }
    this.cachedValue = normalizedValue;
    this.cachedVersion = version;
    this.cachedResult = this.renderBlocks(normalizedValue);
    return this.cachedResult;
  }

  private renderBlocks(value: string): string {
    const lines = value.replace(/\r\n?/g, '\n').split('\n');
    const html: string[] = [];
    const paragraph: string[] = [];
    let listType: 'ol' | 'ul' | null = null;
    let listItems: string[] = [];
    let codeLines: string[] | null = null;

    const flushParagraph = () => {
      if (!paragraph.length) {
        return;
      }
      const paragraphHtml = `<p>${this.renderInline(paragraph.join('\n')).replace(/\n/g, () => '<br>')}</p>`;
      html[html.length] = paragraphHtml;
      paragraph.length = 0;
    };

    const flushList = () => {
      if (!listType || !listItems.length) {
        return;
      }
      html.push(`<${listType}>${listItems.map(item => `<li>${item}</li>`).join('')}</${listType}>`);
      listType = null;
      listItems = [];
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = getOwnProperty(lines, index) ?? '';
      const trimmed = line.trim();

      if (codeLines) {
        if (trimmed.startsWith('```')) {
          html.push(`<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`);
          codeLines = null;
        }
        else {
          codeLines.push(line);
        }
        continue;
      }

      if (trimmed.startsWith('```')) {
        flushParagraph();
        flushList();
        codeLines = [];
        continue;
      }

      if (!trimmed) {
        flushParagraph();
        flushList();
        continue;
      }

      const table = this.tryRenderTable(lines, index);
      if (table) {
        flushParagraph();
        flushList();
        html[html.length] = table.html;
        index = table.endIndex;
        continue;
      }

      const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
      if (heading) {
        flushParagraph();
        flushList();
        const level = heading[1].length;
        html.push(`<h${level}>${this.renderInline(heading[2])}</h${level}>`);
        continue;
      }

      if (this.isHorizontalRule(trimmed)) {
        flushParagraph();
        flushList();
        html[html.length] = '<hr>';
        continue;
      }

      const quote = /^>\s?(.*)$/.exec(trimmed);
      if (quote) {
        flushParagraph();
        flushList();
        const quoteLines = [quote[1]];
        while (index + 1 < lines.length) {
          const nextQuote = /^>\s?(.*)$/.exec((lines[index + 1] ?? '').trim());
          if (!nextQuote) {
            break;
          }
          quoteLines.push(nextQuote[1]);
          index += 1;
        }
        const quoteHtml = `<blockquote><p>${this.renderInline(quoteLines.join('\n')).replace(/\n/g, () => '<br>')}</p></blockquote>`;
        html[html.length] = quoteHtml;
        continue;
      }

      const unordered = /^[-*+]\s+(.+)$/.exec(trimmed);
      const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);
      if (unordered !== null || ordered !== null) {
        flushParagraph();
        const nextType = ordered ? 'ol' : 'ul';
        if (listType && listType !== nextType) {
          flushList();
        }
        listType = nextType;
        listItems.push(this.renderInline((ordered ?? unordered)?.[1] ?? ''));
        continue;
      }

      flushList();
      paragraph.push(line);
    }

    if (codeLines) {
      html.push(`<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`);
    }
    flushParagraph();
    flushList();

    return html.join('');
  }

  private tryRenderTable(lines: string[], startIndex: number): { html: string; endIndex: number } | null {
    const header = getOwnProperty(lines, startIndex)?.trim() ?? '';
    const separator = lines[startIndex + 1]?.trim() ?? '';
    if (!header.includes('|') || !this.isTableSeparator(separator)) {
      return null;
    }

    const headers = this.parseTableCells(header);
    const rows: string[][] = [];
    let endIndex = startIndex + 1;

    while (endIndex + 1 < lines.length) {
      const row = lines[endIndex + 1]?.trim() ?? '';
      if (!row.includes('|') || !row) {
        break;
      }
      rows.push(this.parseTableCells(row));
      endIndex += 1;
    }

    const labels = headers.map(cell => this.formatHeaderCell(cell));
    const thead = `<thead><tr>${labels.map(cell => `<th>${this.renderInline(cell)}</th>`).join('')}</tr></thead>`;
    const tbody = rows.length
      ? `<tbody>${rows.map(row => `<tr>${labels.map((label, cellIndex) => this.renderTableCell(label, getOwnProperty(row, cellIndex) ?? '')).join('')}</tr>`).join('')}</tbody>`
      : '';

    const tableShellClasses = 'w-full max-w-full mt-3 mb-1 overflow-x-auto rounded-xl border border-[var(--ui-table-shell-border)] bg-[var(--color-blue-830)] shadow-[inset_0_1px_0_rgb(255_255_255/3%)] [scrollbar-color:color-mix(in_srgb,var(--color-blue-640)_55%,transparent)_transparent] [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue-640)]';
    const wideTableClasses = headers.length > 3
      ? ' [&&]:overflow-visible [&&]:border-0 [&&]:bg-transparent [&&]:shadow-none [&&_table]:block [&&_tbody]:block [&&_table]:w-full [&&_tbody]:w-full [&&_table]:min-w-0 [&&_tbody]:min-w-0 [&_thead]:absolute [&_thead]:-m-px [&_thead]:h-px [&_thead]:w-px [&_thead]:overflow-hidden [&_thead]:whitespace-nowrap [&_thead]:border-0 [&_thead]:p-0 [&_thead]:[clip-path:inset(50%)] [&_tr]:grid [&_tr]:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] [&_tr]:overflow-hidden [&_tr]:rounded-xl [&_tr]:border [&_tr]:border-[var(--ui-table-shell-border)] [&_tr]:bg-[var(--ui-table-row-odd)] [&_tr]:shadow-[0_8px_22px_color-mix(in_srgb,var(--color-shadow-medium)_70%,transparent)] [&_tr+tr]:mt-2.5 [&&_td]:grid [&&_td]:grid-cols-[minmax(96px,0.42fr)_minmax(0,1fr)] [&&_td]:gap-2.5 [&&_td]:min-w-0 [&&_td]:max-w-none [&&_td]:border-r-0 [&&_td]:border-t-0 [&&_td]:border-b [&&_td]:border-b-[var(--ui-table-row-border)] [&&_td]:bg-transparent [&&_td]:px-[11px] [&&_td]:py-[9px] [&_td]:before:content-[attr(data-label)] [&_td]:before:text-[10px] [&_td]:before:font-bold [&_td]:before:uppercase [&_td]:before:leading-[1.5] [&_td]:before:tracking-[0.05em] [&_td]:before:text-[var(--color-text5)] [&_td]:before:[overflow-wrap:anywhere] [&_td:first-child]:bg-[color-mix(in_srgb,var(--color-blue-640)_7%,transparent)] max-[480px]:[&_tr]:grid-cols-1 max-[480px]:[&&_td]:grid-cols-[minmax(88px,0.38fr)_minmax(0,1fr)] [&&_td:empty]:hidden [&_td>span]:min-w-0 [&_td>span]:[overflow-wrap:anywhere] [&_td>span]:text-[var(--color-text2)]'
      : '';

    const tableLabel = this.escapeAttribute(this.translationService.translate('Result table'));
    return { html: `<div class="${tableShellClasses}${wideTableClasses}" role="region" aria-label="${tableLabel}" tabindex="0"><table>${thead}${tbody}</table></div>`, endIndex };
  }

  private formatHeaderCell(value: string): string {
    const trimmed = value.trim();
    if (!this.isHeaderIdentifier(trimmed)) {
      return value;
    }
    return trimmed.split(/[_-]/).map(word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(' ');
  }

  private isHorizontalRule(value: string): boolean {
    const compact = value.replace(/\s/g, '');
    const marker = compact.charAt(0);
    return compact.length >= 3
      && '-*_'.includes(marker)
      && Array.from(compact).every(character => character === marker);
  }

  private isTableSeparator(value: string): boolean {
    let content = value.trim();
    if (content.startsWith('|')) {
      content = content.slice(1);
    }
    if (content.endsWith('|')) {
      content = content.slice(0, -1);
    }
    const cells = content.split('|');
    return cells.length >= 2 && cells.every(cell => {
      let rule = cell.trim();
      if (rule.startsWith(':')) {
        rule = rule.slice(1);
      }
      if (rule.endsWith(':')) {
        rule = rule.slice(0, -1);
      }
      rule = rule.trim();
      return rule.length >= 3 && Array.from(rule).every(character => character === '-');
    });
  }

  private isHeaderIdentifier(value: string): boolean {
    return value.length > 0 && value.split(/[_-]/).every(part => part.length > 0 && Array.from(part).every(character => {
      const isLowercaseLetter = character >= 'a' && character <= 'z';
      const isDigit = character >= '0' && character <= '9';
      return isLowercaseLetter || isDigit;
    }));
  }

  private formatValueCell(value: string): string {
    const trimmed = value.trim();
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
      return value;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    }
    catch {
      return value;
    }
    if (!Array.isArray(parsed)) {
      return value;
    }

    if (parsed.some(item => item !== null && typeof item === 'object')) {
      return value;
    }

    const items = parsed
      .filter(item => item !== null && item !== undefined)
      .map(item => String(item).trim())
      .filter(Boolean);
    return parsed.length && !items.length ? value : items.join(', ');
  }

  private renderTableCell(label: string, value: string): string {
    const rendered = this.renderInline(this.formatValueCell(value));
    const content = rendered ? `<span>${rendered}</span>` : '';
    return `<td data-label="${this.escapeAttribute(label)}">${content}</td>`;
  }

  private parseTableCells(line: string): string[] {
    let content = line.startsWith('|') ? line.slice(1) : line;
    if (content.endsWith('|') && !content.endsWith('\\|')) {
      content = content.slice(0, -1);
    }
    const cells: string[] = [];
    let cell = '';
    let escaped = false;
    for (const character of content) {
      if (escaped) {
        cell += character === '|' ? '|' : `\\${character}`;
        escaped = false;
      }
      else if (character === '\\') {
        escaped = true;
      }
      else if (character === '|') {
        cells.push(cell.trim());
        cell = '';
      }
      else {
        cell += character;
      }
    }
    cells.push(`${cell}${escaped ? '\\' : ''}`.trim());
    return cells;
  }

  private renderInline(value: string): string {
    const tokens: string[] = [];
    const token = (tokenValue: string) => {
      const key = `\uE000${tokens.length}\uE001`;
      tokens.push(tokenValue);
      return key;
    };

    let text = value
      .replace(/\\([\\`*_[\]<>|])/g, (_match, literal: string) => token(this.escapeHtml(literal)))
      .replace(/`([^`]+)`/g, (_match, code: string) => token(`<code>${this.escapeHtml(code)}</code>`))
      .replace(/\[([^\]]+)]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
        const url = this.escapeAttribute(this.sanitizeHref(href));
        return token(`<a href="${url}" target="_blank" rel="noopener noreferrer">${this.renderInline(label)}</a>`);
      });

    text = this.escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, (_match, content: string) => `<strong>${content}</strong>`)
      .replace(/(?<!\w)__([^_\n]+)__(?!\w)/g, (_match, content: string) => `<strong>${content}</strong>`)
      .replace(/\*([^*]+)\*/g, (_match, content: string) => `<em>${content}</em>`)
      .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, (_match, content: string) => `<em>${content}</em>`)
      .replace(/~~([^~]+)~~/g, (_match, content: string) => `<del>${content}</del>`);

    tokens.forEach((tokenValue, index) => {
      text = text.replaceAll(`\uE000${index}\uE001`, tokenValue);
    });

    return text;
  }

  private sanitizeHref(value: string): string {
    const trimmed = value.trim();
    return /^(https?:|mailto:|\/|#)/i.test(trimmed) ? trimmed : '#';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value);
  }
}
