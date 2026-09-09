import { Pipe, PipeTransform } from '@angular/core';
@Pipe({
  name: 'sortGroupedResults',
  standalone: true
})
export class SortGroupedResultsPipe implements PipeTransform {
  private readonly modelOrder = [ 'defacement_model', 'leak_model', 'chat_model', 'exploit_model', 'apt_model', 'malware_model', 'generic_model', 'tracking_model', 'news_model' ];

  transform( value: Record<string, unknown[]> ): {
        key: string;
        value: unknown[];
    }[] {
    return Object.entries(value)
      .map(([key, val]) => ({ key, value: val }))
      .sort((a, b) => {
        const ai = this.modelOrder.indexOf(a.key);
        const bi = this.modelOrder.indexOf(b.key);
        return (ai === -1 ? this.modelOrder.length : ai) - (bi === -1 ? this.modelOrder.length : bi);
      });
  }
}
