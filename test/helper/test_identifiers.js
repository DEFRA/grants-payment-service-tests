import { randomInt } from 'node:crypto'

const runStartEnv = 'GRANTS_TEST_IDENTIFIER_START'
const identifiersPerWorker = 100
const maxWorkers = 1000
const maxRunStart = 100000000 - identifiersPerWorker * maxWorkers

export function initializeTestIdentifierRun() {
  if (process.env[runStartEnv] === undefined) {
    process.env[runStartEnv] = String(randomInt(1, maxRunStart + 1))
  }
}

export function createTestIdentifierGenerator(runStart, workerId) {
  if (!Number.isInteger(runStart) || runStart < 1 || runStart > maxRunStart) {
    throw new Error(`Invalid ${runStartEnv}: ${runStart}`)
  }

  const match = /^(\d+)-(\d+)$/.exec(workerId)
  if (!match) {
    throw new Error(`Invalid WebdriverIO worker ID: ${workerId}`)
  }

  const capability = Number(match[1])
  const worker = Number(match[2])
  const sum = capability + worker
  // Pair the capability and worker indexes so their reserved ranges cannot overlap.
  const workerSlot = (sum * (sum + 1)) / 2 + worker
  if (!Number.isSafeInteger(workerSlot) || workerSlot >= maxWorkers) {
    throw new Error(
      `WebdriverIO worker ID exceeds identifier capacity: ${workerId}`
    )
  }

  let count = 0
  return () => {
    if (count >= identifiersPerWorker) {
      throw new Error(`Identifier capacity exceeded for worker ${workerId}`)
    }

    const offset = runStart + workerSlot * identifiersPerWorker + count++
    return {
      sbi: String(800000000 + offset),
      frn: String(700000000 + offset)
    }
  }
}

let nextIdentifiers

export function generateTestIdentifiers() {
  if (!nextIdentifiers) {
    nextIdentifiers = createTestIdentifierGenerator(
      Number(process.env[runStartEnv]),
      process.env.WDIO_WORKER_ID
    )
  }
  return nextIdentifiers()
}
