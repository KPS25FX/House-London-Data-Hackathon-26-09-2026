/** Shared memo status so steps (F01) can reflect the memo panel (F10). */
export const memoState = { busy: false, forCode: null as string | null, text: '' };
type Fn = () => void;
const fns: Fn[] = [];
export const onMemoChange = (f: Fn) => { fns.push(f); };
export const memoChanged = () => fns.forEach(f => f());
let req: () => void = () => {};
export const requestMemo = () => req();
export const setRequestMemo = (f: () => void) => { req = f; };
