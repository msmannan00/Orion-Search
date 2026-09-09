import { CredentialResultItem } from '../credentials/credential.callback.model';

export type RankedResultItem = CredentialResultItem;

export class RankedCallbackModel {
  result: RankedResultItem[] = [];
  pageCount = 0;
  totalHits = 0;

  constructor(init?: Partial<RankedCallbackModel>) {
    if (init) {
      this.result = init.result ?? [];
      this.pageCount = init.pageCount ?? 0;
      this.totalHits = init.totalHits ?? 0;
    }
  }
}
