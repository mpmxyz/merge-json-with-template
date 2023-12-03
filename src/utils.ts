export type PatternElement = string | number
export type Pattern = PatternElement[]

//semi-strict path parser, permits no whitespace between/within tokens and no double quotes
export function parsePath(path: string): undefined | Pattern {
  function fail(): undefined {
    return undefined
  }

  const result: Pattern = []
  const tokens = [
    ...path.matchAll(/\.|[^.[]+|\[[0-9]+\]|\["(?:[^"]|\\.)*"\]/g)
  ].map(it => it[0])
  let afterDot = false
  let first = true

  if (tokens.join('') !== path) {
    return fail()
  }
  let token: PatternElement
  for (token of tokens) {
    if (token === '.') {
      if (afterDot || first) {
        return fail()
      }
      afterDot = true
      continue
    } else if (token.endsWith(']')) {
      if (afterDot) {
        return fail()
      }
      try {
        token = JSON.parse(token.slice(1, -1))
        if (typeof token != 'string' && typeof token != 'number') {
          return fail()
        }
      } catch (e) {
        return fail()
      }
    } else {
      if (!afterDot && !first) {
        return fail()
      }
    }
    result.push(token)
    afterDot = false
    first = false
  }
  if (afterDot) {
    return fail()
  }
  return result
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function getPath(obj: any, parsedPath: Pattern): unknown {
  for (const key of parsedPath) {
    if (!obj || typeof obj != 'object') {
      return undefined
    }
    obj = obj[key]
  }
  return obj
}

export function setPath(
  obj: any,
  path: Pattern,
  value: any,
  forcePathType = false,
  i = 0
): unknown {
  if (i >= path.length) {
    return value
  }
  const key = path[i]
  if (forcePathType || typeof obj != 'object') {
    if (typeof key == 'number' && !Array.isArray(obj)) {
      obj = []
    } else if (
      typeof key == 'string' &&
      (typeof obj != 'object' || Array.isArray(obj))
    ) {
      obj = {}
    }
  }
  obj[key] = setPath(obj[key], path, value, forcePathType, i + 1)
  return obj
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function matchPath(matchedPath: Pattern, patternPath: Pattern): boolean {
  if (matchedPath.length !== patternPath.length) {
    return false
  }
  for (let i = 0; i < matchedPath.length; i++) {
    const matchedKey = String(matchedPath[i])
    const patternKey = String(patternPath[i])
    if (patternKey !== '*' && patternKey !== matchedKey) {
      return false
    }
  }
  return true
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function stripMatchingElements(
  obj: any,
  patterns: Pattern[],
  pathStack: string[] = []
): unknown {
  if (patterns.some(pattern => matchPath(pathStack, pattern))) {
    return undefined
  }
  if (typeof obj == 'object') {
    const newArray: any[] = []
    for (const key in obj) {
      pathStack.push(key)
      const newValue = stripMatchingElements(obj[key], patterns, pathStack)
      if (newValue === undefined) {
        delete obj[key]
      } else {
        if (Array.isArray(obj)) {
          newArray.push(newValue)
        } else {
          obj[key] = newValue
        }
      }
      pathStack.pop()
    }
    if (Array.isArray(obj)) {
      obj = newArray
    }
  }
  return obj
}

export function merge(
  target: any,
  source: any,
  arraysToAppend: Pattern[] = [],
  pathStack: string[] = []
): unknown {
  if (source === undefined) {
    return target
  }
  if (
    typeof target != 'object' ||
    typeof source != 'object' ||
    Array.isArray(target) !== Array.isArray(source)
  ) {
    return source
  }
  if (
    arraysToAppend &&
    Array.isArray(target) &&
    arraysToAppend.some(pattern => matchPath(pathStack, pattern))
  ) {
    for (const value of source) {
      target.push(value)
    }
  } else {
    for (const key in source) {
      pathStack.push(key)
      target[key] = merge(target[key], source[key], arraysToAppend, pathStack)
      pathStack.pop()
    }
  }
  return target
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function applyTemplate(
  template: string,
  replacer: (key: string) => string
): string {
  return template.replaceAll(/\$\$|\$\w+|\$\((?:[^)$]|\$.)+\)/g, match => {
    let key: string
    if (match === '$$') {
      return '$'
    } else if (match.startsWith('$(')) {
      key = match.slice(2, -1)
      key = key.replace(/\$(.)/g, '$1')
    } else {
      key = match.slice(1)
    }

    return replacer(key)
  })
}
