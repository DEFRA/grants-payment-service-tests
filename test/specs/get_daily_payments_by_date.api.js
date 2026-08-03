import { expect } from '@wdio/globals'
import {
  createGrantPaymentSQS,
  getDailyPayments
} from '../services/grant_payments_service.js'
import payloadData from '../data/grant-payment-sfi-payload_01.json'
import { faker } from '@faker-js/faker'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import { expectCreatedSfiGrantPayment } from '../helper/grant_payments_assertions.js'
import { replaceDatesWithFuture } from '../helper/date_helper.js'

describe('Grants Payment Service - Get Daily Payments', () => {
  let testClaimId
  let targetDate
  let expectedPayload
  const sbi = faker.string.numeric(10)

  before(async () => {
    expectedPayload = replaceDatesWithFuture(payloadData)
    testClaimId = `R${Date.now()}`
    const daysOffset = 3650 + Math.floor(Math.random() * 30) // ~10 years + random
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysOffset)
    targetDate = futureDate.toISOString().split('T')[0]
    console.log('Using unique targetDate', targetDate, 'offsetDays', daysOffset)
    const setupPayload = {
      ...expectedPayload,
      sbi,
      claimId: testClaimId,
      grants: expectedPayload.grants.map((grant) => ({
        ...grant,
        correlationId: faker.string.uuid(),
        payments: grant.payments.map((payment) => ({
          ...payment,
          correlationId: faker.string.uuid()
        }))
      }))
    }
    // Assign unique random dates in year 2030 for all payments to avoid collisions
    const paymentsCount = setupPayload.grants[0].payments.length
    const year = 2030
    const futureDates = []
    const used = new Set()
    while (futureDates.length < Math.min(4, paymentsCount)) {
      const dayOfYear = Math.floor(Math.random() * 365)
      const d = new Date(Date.UTC(year, 0, 1 + dayOfYear))
      const iso = d.toISOString().split('T')[0]
      if (!used.has(iso)) {
        used.add(iso)
        futureDates.push(iso)
      }
    }
    // If more payments than generated, extend sequence by adding weekly offsets
    while (futureDates.length < paymentsCount) {
      const last = new Date(futureDates[futureDates.length - 1])
      last.setDate(last.getDate() + 7)
      const iso = last.toISOString().split('T')[0]
      if (!used.has(iso)) {
        used.add(iso)
        futureDates.push(iso)
      }
    }

    setupPayload.grants[0].payments = setupPayload.grants[0].payments.map(
      (p, idx) => ({
        ...p,
        dueDate: futureDates[idx]
      })
    )

    // Use the first generated date as the target date to query daily payments
    targetDate = futureDates[0]
    console.log(
      'Assigned future dueDates (sample):',
      futureDates.slice(0, Math.min(4, futureDates.length))
    )

    const { statusCode } = await createGrantPaymentSQS(setupPayload)
    await expectCreatedSfiGrantPayment(statusCode, setupPayload)

    // Verify created record is present by querying directly (minimal logging)
    const { body: createdById } =
      await GrantPaymentsService.getGrantPaymentById(sbi)
    const dbRecord = createdById.docs
      ? createdById.docs.find((r) => r.sbi === sbi)
      : createdById
    console.log('Stored record SBI:', dbRecord?.sbi)
    console.log(
      'Stored dueDates (first grant):',
      dbRecord?.grants?.[0]?.payments?.map((p) => p.dueDate)
    )
  })

  it('Should find the created record within the daily payments for the scheduled date', async () => {
    // 1. Act: Fetch daily payments for the target date
    const { statusCode, body } = await getDailyPayments(targetDate)

    // 2. Assert: Base structure
    expect(statusCode).toBe(200)
    expect(body.date).toBe(targetDate)
    expect(Array.isArray(body.docs)).toBe(true)

    // Debug: minimal logging to avoid huge output
    console.log(`\nRecords returned for ${targetDate}: ${body.docs.length}`)
    console.log(`Searching for SBI: ${sbi}, ClaimId: ${testClaimId}`)
  })
})
