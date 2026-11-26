import { describe, expect, it } from 'bun:test'
import { readdirSync } from 'node:fs'
import * as entry from './index.js'
import * as internal from './internal.js'

const nonTopicFiles = ['index.ts', 'internal.ts', 'types.ts']

const topicFiles = readdirSync(import.meta.dirname).filter((file) => {
  return file.endsWith('.ts') && !file.endsWith('.test.ts') && !nonTopicFiles.includes(file)
})

describe('index', () => {
  it.each(topicFiles)('should export every runtime name of %s', async (file) => {
    const module = await import(`./${file}`)
    const value = Object.keys(module)
    const missing = value.filter((name) => !(name in entry))

    expect(missing).toEqual([])
  })

  it('should export no name of the internal module', () => {
    const value = Object.keys(internal)
    const leaked = value.filter((name) => name in entry)

    expect(leaked).toEqual([])
  })
})
