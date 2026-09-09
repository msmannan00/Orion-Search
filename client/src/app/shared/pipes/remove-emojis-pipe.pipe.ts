import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'removeEmojis' })
export class RemoveEmojisPipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) {
      return '';
    }
    return value.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])/gu, '').trim();
  }
}
