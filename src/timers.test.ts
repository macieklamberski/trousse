import { describe, expect, it, spyOn } from 'bun:test'
import { sleep } from './timers.js'

describe('sleep', () => {
  it('should resolve after roughly the given duration', async () => {
    const start = Date.now()

    await sleep(20)

    // Allow one millisecond of timer rounding slack.
    expect(Date.now() - start).toBeGreaterThanOrEqual(19)
  })

  it('should resolve immediately for zero', async () => {
    await sleep(0)

    expect(true).toBe(true)
  })

  it('should return a promise resolving to undefined', async () => {
    expect(await sleep(1)).toBeUndefined()
  })

  it('should clamp a delay above the timer maximum', () => {
    const setTimeoutSpy = spyOn(globalThis, 'setTimeout')

    void sleep(2 ** 31)

    const delay = setTimeoutSpy.mock.calls[0][1]

    clearTimeout(setTimeoutSpy.mock.results[0].value as ReturnType<typeof setTimeout>)
    setTimeoutSpy.mockRestore()

    expect(delay).toBe(2147483647)
  })
})
