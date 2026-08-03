/**
 * Helper to replace hardcoded dates in payloads with future dates
 * Maintains the same day-of-month, just shifts to future dates
 */

export function getFutureDate(daysOffset = 15) {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString().split('T')[0]
}

/**
 * Replace dates in payload with future dates
 * Maps old dates to corresponding future dates maintaining patterns
 */
export function replaceDatesWithFuture(payload) {
  const dateMap = {
    '2026-08-15': getFutureDate(15),
    '2026-11-15': getFutureDate(106), // ~3.5 months
    '2026-12-15': getFutureDate(136), // ~4.5 months
    '2027-02-15': getFutureDate(197), // ~6.5 months
    '2027-05-15': getFutureDate(287) // ~9.5 months
  }

  const replaceInObject = (obj) => {
    if (typeof obj === 'string') {
      return dateMap[obj] || obj
    }
    if (Array.isArray(obj)) {
      return obj.map(replaceInObject)
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        acc[key] = replaceInObject(obj[key])
        return acc
      }, {})
    }
    return obj
  }

  return replaceInObject(JSON.parse(JSON.stringify(payload)))
}

export default { getFutureDate, replaceDatesWithFuture }
