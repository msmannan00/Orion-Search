export function initCallbackModel<TRaw, TResult>( target: { Result: TResult[]; Page_Count: number; }, init: { Result?: Partial<TRaw>[]; Page_Count?: number } | null | undefined, makeResultItem: (r: Partial<TRaw>) => TResult ) {
  if (!init) {
    return;
  }
  target.Result = init.Result?.map((r: Partial<TRaw>) => makeResultItem(r)) ?? [];
  target.Page_Count = init.Page_Count ?? 0;
}
