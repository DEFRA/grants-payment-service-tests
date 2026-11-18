import { expect } from '@wdio/globals'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import { expectCreatedSfiGrantPayment } from '../helper/grant_payments_assertions.js'
import { generateTestIdentifiers } from '../helper/test_identifiers.js'
import payload from '../data/grant-payment-sfi-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Grants Payment Service - Multi-Date Processing', () => {
  let todaySbi, tomorrowSbi
  let todayISO, tomorrowISO
  let todayHubFormat, tomorrowHubFormat

  const formatToHubDate = (isoDate) => {
    const [y, m, d] = isoDate.split('-')
    return `${d}/${m}/${y}`
  }

  before(async () => {
    // 1. Calculate Dates (Today and Tomorrow)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    todayISO = today.toISOString().split('T')[0]
    tomorrowISO = tomorrow.toISOString().split('T')[0]

    todayHubFormat = formatToHubDate(todayISO)
    tomorrowHubFormat = formatToHubDate(tomorrowISO)

    const todayIdentifiers = generateTestIdentifiers()
    const tomorrowIdentifiers = generateTestIdentifiers()
    todaySbi = todayIdentifiers.sbi
    tomorrowSbi = tomorrowIdentifiers.sbi

    console.log(
      `>>> Setup: Creating records for Today (${todayISO}) and Tomorrow (${tomorrowISO})`
    )

    // Helper to build payload and create records
    const setupRecord = async (identifiers, date) => {
      const testPayload = JSON.parse(JSON.stringify(payload))

      Object.assign(testPayload, identifiers)
      testPayload.claimId = `CLAIM_${identifiers.sbi}_${Date.now()}`

      // Dynamic grant correlationId
      testPayload.grants = testPayload.grants.map((grant) => ({
        ...grant,
        correlationId: faker.string.uuid(),

        payments: grant.payments.map((payment, index) => ({
          ...payment,
          dueDate:
            index === 0
              ? date
              : `${new Date().getFullYear() + index + 1}-02-15`,
          status: index === 0 ? 'pending' : payment.status,

          // Dynamic payment correlationId
          correlationId: faker.string.uuid()
        }))
      }))

      const { statusCode } =
        await GrantPaymentsService.createGrantPaymentSQS(testPayload)
      await expectCreatedSfiGrantPayment(statusCode, testPayload)
    }

    await setupRecord(todayIdentifiers, todayISO)
    await setupRecord(tomorrowIdentifiers, tomorrowISO)
  })

  it('should process both Today and Tomorrow payments in a single service call', async () => {
    const { statusCode, body: processResult } =
      await GrantPaymentsService.processPayments()
    expect(statusCode).toBe(200)
    const results = processResult.result
    const processedSbis = results.map((item) => item.body.sbi)
    expect(processedSbis).toContain(todaySbi)
    expect(processedSbis).toContain(tomorrowSbi)
    const todayItem = results.find((item) => item.body.sbi === todaySbi)
    const tomorrowItem = results.find((item) => item.body.sbi === tomorrowSbi)
    expect(todayItem.body.dueDate).toBe(todayHubFormat)
    expect(tomorrowItem.body.dueDate).toBe(tomorrowHubFormat)
    for (const sbi of [todaySbi, tomorrowSbi]) {
      const { body: afterBody } =
        await GrantPaymentsService.getGrantPaymentById(sbi)
      const recordInDb = afterBody.docs.find((r) => r.sbi === sbi)

      const actualStatus = recordInDb.grants[0].payments[0].status
      console.log(`>>> Verification: SBI ${sbi} status is now: ${actualStatus}`)
      expect(actualStatus).toBe('submitted')
      await GrantPaymentsService.deleteGrantPaymentsById(sbi)
    }
  })
})
