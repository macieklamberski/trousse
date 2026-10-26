import { expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const pluginDir = import.meta.dir
const root = join(pluginDir, '..')
const biome = join(root, 'node_modules/.bin/biome')
const fixture = join(pluginDir, 'fixtures/use-any-of.ts')
const flagRegex = /\/\/ flag$/

type Diagnostic = {
  location: {
    start: {
      line: number
    }
  }
}

// The plugin runs alone, through a config of its own, so no project rule reports on the fixture.
const lintFixture = (): Array<number> => {
  const configDir = mkdtempSync(join(tmpdir(), 'trousse-plugin-'))
  const config = {
    plugins: [join(pluginDir, 'use-any-of.grit')],
    linter: { rules: { recommended: false } },
    formatter: { enabled: false },
  }

  writeFileSync(join(configDir, 'biome.json'), JSON.stringify(config))

  const command = [
    biome,
    'lint',
    `--config-path=${configDir}`,
    '--only=plugin',
    '--reporter=json',
    '--max-diagnostics=none',
    fixture,
  ]
  const result = Bun.spawnSync(command, { cwd: root, stdout: 'pipe', stderr: 'pipe' })
  const json = `${result.stdout}`.split('\n').find((line) => line.startsWith('{'))

  if (!json) {
    throw new Error(`Biome reported no diagnostics:\n${result.stdout}${result.stderr}`)
  }

  const { diagnostics } = JSON.parse(json) as { diagnostics: Array<Diagnostic> }
  const lines = diagnostics.map((diagnostic) => diagnostic.location.start.line)

  return [...new Set(lines)].sort((left, right) => left - right)
}

const readFlaggedLines = (): Array<number> => {
  const lines = readFileSync(fixture, 'utf8').split('\n')
  const flagged: Array<number> = []

  for (const [index, line] of lines.entries()) {
    if (flagRegex.test(line)) {
      flagged.push(index + 1)
    }
  }

  return flagged
}

it('should flag the marked fixture lines and no others', () => {
  const flagged = readFlaggedLines()

  expect(flagged.length).toBeGreaterThan(0)
  expect(lintFixture()).toEqual(flagged)
})
