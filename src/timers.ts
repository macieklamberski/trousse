// HTML converts a timer delay to a WebIDL long, and Node and Bun fire a delay above 2^31-1 after
// about 1 ms. Clamping keeps a long sleep long.
// See: https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps.
const maxDelay = 2 ** 31 - 1

export const sleep = (milliseconds: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.min(milliseconds, maxDelay))
  })
}
