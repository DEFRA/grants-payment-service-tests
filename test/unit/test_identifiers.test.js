import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import {
  createTestIdentifierGenerator,
  initializeTestIdentifierRun
} from '../helper/test_identifiers.js'

test('generates sequential matching identifier pairs', () => {
  const next = createTestIdentifierGenerator(1, '0-0')
  assert.deepEqual(next(), {
    sbi: '800000001',
    frn: '700000001'
  })
  assert.deepEqual(next(), {
    sbi: '800000002',
    frn: '700000002'
  })
})

test('reserves non-overlapping ranges for different workers and capabilities', () => {
  const values = new Set()
  for (const workerId of ['0-0', '0-1', '1-0', '1-1']) {
    const next = createTestIdentifierGenerator(1, workerId)
    for (let i = 0; i < 100; i++) {
      const { sbi } = next()
      assert.equal(values.has(sbi), false)
      values.add(sbi)
    }
    assert.throws(next, /Identifier capacity exceeded/)
  }
})

test('keeps identifiers in their required series at the upper limit', () => {
  const next = createTestIdentifierGenerator(99900000, '0-43')
  for (let i = 0; i < 100; i++) {
    const { sbi, frn } = next()
    assert.match(sbi, /^8\d{8}$/)
    assert.match(frn, /^7\d{8}$/)
  }
})

test('rejects invalid starts and worker IDs', () => {
  for (const start of [0, -1, 99900001, NaN, 1.5]) {
    assert.throws(() => createTestIdentifierGenerator(start, '0-0'))
  }
  for (const workerId of [undefined, 'invalid', '0-44']) {
    assert.throws(() => createTestIdentifierGenerator(1, workerId))
  }
})

test('initializes the run start once so workers can inherit it', () => {
  const key = 'GRANTS_TEST_IDENTIFIER_START'
  const previous = process.env[key]
  try {
    delete process.env[key]
    initializeTestIdentifierRun()
    const start = process.env[key]
    assert.ok(Number(start) >= 1 && Number(start) <= 99900000)
    initializeTestIdentifierRun()
    assert.equal(process.env[key], start)
  } finally {
    if (previous === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = previous
    }
  }
})

test('separate worker processes inherit the run start and allocate distinct identifiers', () => {
  const script = `
    import { initializeTestIdentifierRun, generateTestIdentifiers } from './test/helper/test_identifiers.js'
    initializeTestIdentifierRun()
    console.log(JSON.stringify(generateTestIdentifiers()))
  `
  const identifiers = ['0-0', '0-1'].map((workerId) => {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', script],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          GRANTS_TEST_IDENTIFIER_START: '1',
          WDIO_WORKER_ID: workerId
        }
      }
    )
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  })

  assert.deepEqual(identifiers[0], {
    sbi: '800000001',
    frn: '700000001'
  })
  assert.deepEqual(identifiers[1], {
    sbi: '800000201',
    frn: '700000201'
  })
})
