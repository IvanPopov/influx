import { isDef } from "./common";

const t: number = Date.now();
/**
 * Get current time in milliseconds from the time the page is loaded.
 */
export const time: () => number = isDef(window.performance) ?
    (): number => window.performance.now() :
    (): number => Date.now() - t;
