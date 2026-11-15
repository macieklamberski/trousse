import { describe, expect, it } from 'bun:test'
import { escapeHtml, isLocaleSegment, isRegionSegment, t, tx } from './locales.js'

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

  it('should keep a placeholder with no matching param', () => {
    expect(t('Hi {{name}}', {})).toBe('Hi {{name}}')
  })

  it('should not read inherited properties as params', () => {
    expect(t('{{constructor}}', {})).toBe('{{constructor}}')
  })
})

describe('tx', () => {
  it('should keep the trusted template markup and escape param markup', () => {
    expect(tx('Delete <strong>{{name}}</strong>?', { name: '<img src=x onerror=alert(1)>' })).toBe(
      'Delete <strong>&lt;img src=x onerror=alert(1)&gt;</strong>?',
    )
  })

  it('should keep a placeholder with no matching param', () => {
    expect(tx('<b>{{name}}</b>', {})).toBe('<b>{{name}}</b>')
  })

  it('should escape all HTML-significant characters in params', () => {
    expect(tx('{{value}}', { value: `&<>"'` })).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})

describe('isLocaleSegment', () => {
  const languageTags: Array<string> = [
    'fr',
    'pt-br',
    'zh-hant',
    'zh-hant-tw',
    'fil',
    'es-419',
    'en-us',
  ]
  const unnamedTags: Array<string> = ['xx', 'qq', 'en-anything']
  const pathWords: Array<string> = ['api', 'app', 'faq', 'rss', 'about', 'blog', 'news', 'feed']
  const specialPurposeCodes: Array<string> = ['und', 'mul', 'zxx']
  const underscoreTags: Array<string> = ['fr_FR', 'en_GB', 'zh_Hant_HK', 'pt_br']

  it.each(languageTags)('should accept the language tag %s', (value) => {
    expect(isLocaleSegment(value)).toBe(true)
  })

  it.each(unnamedTags)('should refuse the tag %s that CLDR does not name', (value) => {
    expect(isLocaleSegment(value)).toBe(false)
  })

  it.each(pathWords)('should refuse the path word %s', (value) => {
    expect(isLocaleSegment(value)).toBe(false)
  })

  it.each(specialPurposeCodes)('should refuse the special-purpose code %s', (value) => {
    expect(isLocaleSegment(value)).toBe(false)
  })

  it('should refuse a malformed tag', () => {
    const value = 'e'

    expect(isLocaleSegment(value)).toBe(false)
  })

  it.each(underscoreTags)('should refuse the underscore tag %s by default', (value) => {
    expect(isLocaleSegment(value)).toBe(false)
  })

  it.each(underscoreTags)('should accept the underscore tag %s with underscore', (value) => {
    const options = { underscore: true }

    expect(isLocaleSegment(value, options)).toBe(true)
  })

  it.each(languageTags)('should accept the language tag %s with underscore', (value) => {
    const options = { underscore: true }

    expect(isLocaleSegment(value, options)).toBe(true)
  })

  it.each(pathWords)('should refuse the path word %s with underscore', (value) => {
    const options = { underscore: true }

    expect(isLocaleSegment(value, options)).toBe(false)
  })

  it('should accept a tag mixing both separators with underscore', () => {
    const value = 'zh-Hant_HK'
    const options = { underscore: true }

    expect(isLocaleSegment(value, options)).toBe(true)
  })

  it('should refuse a malformed tag mixing both separators with underscore', () => {
    const value = 'en-GB_x'
    const options = { underscore: true }

    expect(isLocaleSegment(value, options)).toBe(false)
  })
})

describe('isRegionSegment', () => {
  const regionCodes: Array<string> = ['us', 'US', 'mx', 'gb', 'de', '419']
  const unnamedCodes: Array<string> = ['xx', 'cb']
  const malformedCodes: Array<string> = ['fra', 'usa', '1', '']
  const specialPurposeCodes: Array<string> = ['zz', 'qo', 'xa', 'xb']

  it.each(regionCodes)('should accept the region code %s', (value) => {
    expect(isRegionSegment(value)).toBe(true)
  })

  it.each(unnamedCodes)('should refuse the code %s that CLDR does not name', (value) => {
    expect(isRegionSegment(value)).toBe(false)
  })

  it.each(malformedCodes)('should refuse the malformed code %s', (value) => {
    expect(isRegionSegment(value)).toBe(false)
  })

  it.each(specialPurposeCodes)('should refuse the special-purpose code %s', (value) => {
    expect(isRegionSegment(value)).toBe(false)
  })

  it('should refuse a locale with a region', () => {
    const value = 'en-us'

    expect(isRegionSegment(value)).toBe(false)
  })

  it('should refuse a language code', () => {
    const value = 'en'

    expect(isRegionSegment(value)).toBe(false)
  })
})
