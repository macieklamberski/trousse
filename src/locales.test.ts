import { describe, expect, it } from 'bun:test'
import { escapeHtml, t, tx } from './locales.js'

describe('escapeHtml', () => {
  it('should escape all HTML-significant characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })

  it('should return a string without significant characters unchanged', () => {
    expect(escapeHtml('plain text 123')).toBe('plain text 123')
  })

  it('should escape characters mixed into surrounding text', () => {
    expect(escapeHtml('a < b && c > d')).toBe('a &lt; b &amp;&amp; c &gt; d')
  })

  it('should return an empty string unchanged', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('t', () => {
  it('should interpolate a single placeholder', () => {
    expect(t('Hello {{name}}', { name: 'World' })).toBe('Hello World')
  })

  it('should interpolate multiple placeholders', () => {
    expect(t('{{done}} of {{total}}', { done: 3, total: 10 })).toBe('3 of 10')
  })

  it('should stringify number params', () => {
    expect(t('{{count}} items', { count: 5 })).toBe('5 items')
  })

  it('should return the template unchanged when there are no placeholders', () => {
    expect(t('No placeholders here', {})).toBe('No placeholders here')
  })

  it.todo('should handle placeholder with no matching param', () => {
    // A placeholder whose key is absent from params currently interpolates the literal text
    // "undefined", the test should pin down the intended behavior for this case.
  })
})

describe('tx', () => {
  it('should keep the trusted template markup and escape param markup', () => {
    expect(tx('Delete <strong>{{name}}</strong>?', { name: '<img src=x onerror=alert(1)>' })).toBe(
      'Delete <strong>&lt;img src=x onerror=alert(1)&gt;</strong>?',
    )
  })

  it('should escape all HTML-significant characters in params', () => {
    expect(tx('{{value}}', { value: `&<>"'` })).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})
