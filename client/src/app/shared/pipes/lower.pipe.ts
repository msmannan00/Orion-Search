import { Pipe, PipeTransform } from '@angular/core';
@Pipe({
  name: 'lower'
})
export class LowerPipe implements PipeTransform {
  transform(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    let text: string;
    try {
      text = typeof value === 'object' ? JSON.stringify(value) ?? '' : String(value);
    }
    catch {
      text = '';
    }
    return text.toLowerCase();
  }
}
