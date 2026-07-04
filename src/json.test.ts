import { describe, expect, it } from 'bun:test'
import { isJsonLike, isParseableJson } from './json.js'

const singleWhitespaceRegex = /^\s$/

describe('isJsonLike', () => {
  describe('valid JSON objects', () => {
    it('should identify simple JSON object', () => {
      expect(isJsonLike('{"name":"John","age":30}')).toBe(true)
    })

    it('should identify JSON object with whitespace', () => {
      expect(isJsonLike('  {  "name" : "John"  }  ')).toBe(true)
    })

    it('should identify empty JSON object', () => {
      expect(isJsonLike('{}')).toBe(true)
    })

    it('should identify empty JSON object with whitespace', () => {
      expect(isJsonLike('  {  }  ')).toBe(true)
    })

    it('should identify nested JSON object', () => {
      expect(isJsonLike('{"person":{"name":"John","age":30}}')).toBe(true)
    })

    it('should identify multiline JSON object', () => {
      const value = `{
        "name": "John",
        "age": 30
      }`

      expect(isJsonLike(value)).toBe(true)
    })

    it('should identify JSON object with unicode whitespace', () => {
      expect(isJsonLike('\u00a0{"a":1}\u00a0')).toBe(true)
      expect(isJsonLike('\u3000{"a":1}\u2028')).toBe(true)
      expect(isJsonLike('\ufeff{"a":1}\ufeff')).toBe(true)
    })
  })

  describe('valid JSON arrays', () => {
    it('should identify simple JSON array', () => {
      expect(isJsonLike('[1,2,3]')).toBe(true)
    })

    it('should identify JSON array with whitespace', () => {
      expect(isJsonLike('  [  1, 2, 3  ]  ')).toBe(true)
    })

    it('should identify empty JSON array', () => {
      expect(isJsonLike('[]')).toBe(true)
    })

    it('should identify empty JSON array with whitespace', () => {
      expect(isJsonLike('  [  ]  ')).toBe(true)
    })

    it('should identify array of objects', () => {
      expect(isJsonLike('[{"id":1},{"id":2}]')).toBe(true)
    })

    it('should identify multiline JSON array', () => {
      const value = `[
        {"name": "John"},
        {"name": "Jane"}
      ]`

      expect(isJsonLike(value)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should reject string with JSON-like content embedded', () => {
      expect(isJsonLike('Text before {"name":"John"} text after')).toBe(false)
    })

    it('should reject string with escaped braces', () => {
      expect(isJsonLike('"\\{\\"name\\":\\"John\\"\\}"')).toBe(false)
    })

    it('should reject strings that start with brace but end differently', () => {
      expect(isJsonLike('{ "name": "test" ]')).toBe(false)
    })

    it('should reject strings that start with bracket but end differently', () => {
      expect(isJsonLike('[ 1, 2, 3 }')).toBe(false)
    })
  })

  describe('invalid JSON-like structures', () => {
    it('should reject plain string', () => {
      expect(isJsonLike('Hello World')).toBe(false)
    })

    it('should reject number', () => {
      expect(isJsonLike('42')).toBe(false)
    })

    it('should reject boolean', () => {
      expect(isJsonLike('true')).toBe(false)
    })

    it('should reject null', () => {
      expect(isJsonLike('null')).toBe(false)
    })

    it('should reject unbalanced braces', () => {
      expect(isJsonLike('{"name":"John"')).toBe(false)
    })

    it('should reject unbalanced brackets', () => {
      expect(isJsonLike('[1,2,3')).toBe(false)
    })

    it('should reject mixed opening/closing (braces)', () => {
      expect(isJsonLike('{]')).toBe(false)
    })

    it('should reject mixed opening/closing (brackets)', () => {
      expect(isJsonLike('[}')).toBe(false)
    })

    it('should reject empty string', () => {
      expect(isJsonLike('')).toBe(false)
    })

    it('should reject whitespace only', () => {
      expect(isJsonLike('   ')).toBe(false)
    })

    it('should reject too short string', () => {
      expect(isJsonLike('{')).toBe(false)
      expect(isJsonLike('[')).toBe(false)
    })

    it('should reject NEL-wrapped object, as NEL is not regex whitespace', () => {
      expect(isJsonLike('\u0085{"a":1}')).toBe(false)
    })

    it('should reject brace-and-whitespace-only strings', () => {
      expect(isJsonLike(' { ')).toBe(false)
      expect(isJsonLike(' ] ')).toBe(false)
    })
  })

  describe('whitespace handling', () => {
    // isJsonLike scans characters manually instead of testing regexes, so its internal
    // whitespace check must match the \s set the regexes used. Wrapping a code point
    // around a JSON literal returns true only when that code point counts as whitespace,
    // so comparing against /^\s$/ for all 65536 code points proves the two sets are
    // identical and can never silently drift apart.
    it('should treat exactly the regex \\s set as whitespace, for all code points', () => {
      for (let code = 0; code <= 0xffff; code++) {
        const char = String.fromCharCode(code)
        const wrapped = `${char}{"a":1}${char}`

        expect(isJsonLike(wrapped)).toBe(singleWhitespaceRegex.test(char))
      }
    })
  })
})

describe('isParseableJson', () => {
  it('should accept a valid JSON object', () => {
    expect(isParseableJson('{"name":"John","age":30}')).toBe(true)
  })

  it('should accept a valid JSON array', () => {
    expect(isParseableJson('[1, 2, 3]')).toBe(true)
  })

  it('should reject a JSON-shaped but unparseable object (CSS rule)', () => {
    expect(isParseableJson('{ color: red; padding: 4px }')).toBe(false)
  })

  it('should reject trailing-comma JSON5/JSONC dialects', () => {
    expect(isParseableJson('{"a": 1,}')).toBe(false)
  })

  it('should reject a plain string', () => {
    expect(isParseableJson('Hello World')).toBe(false)
  })
})
