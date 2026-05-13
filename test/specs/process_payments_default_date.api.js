import { expect } from '@wdio/globals'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import payload from '../data/grant-payment-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Grants Payment Service - Default Date Processing', () => {
  let testSbi
  let testClaimId
  let tomorrowISO
  let tomorrowHubFormat

  const formatToHubDate = (isoDate) => {
    const [y, m, d] = isoDate.split('-')
    return `${d}/${m}/${y}`
  }

  before(async () => {
    // 1. Calculate Tomorrow's Date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrowISO = tomorrow.toISOString().split('T')[0]
    tomorrowHubFormat = formatToHubDate(tomorrowISO)

    testSbi = faker.string.numeric(10)
    testClaimId = `DFT${Date.now()}`

    console.log(
      `>>> Setup: Creating record for tomorrow's date: ${tomorrowISO}`
    )

    const setupPayload = {
      ...payload,
      claimId: testClaimId,
      sbi: testSbi
    }

    setupPayload.grants[0].payments[0].dueDate = tomorrowISO
    setupPayload.grants[0].payments[0].status = 'pending'

    const { statusCode } =
      await GrantPaymentsService.createGrantPayment(setupPayload)
    expect(statusCode).toBe(201)
  })

  it('should process payments for tomorrow by default when no date is provided in the request', async () => {
    const { statusCode, body: processResult } =
      await GrantPaymentsService.processPayments()

    expect(statusCode).toBe(200)
    expect(processResult.message).toContain(
      `Triggered daily payment processing for ${tomorrowISO}`
    )

    const processedItem = processResult.result.find(
      (item) => item.body.sbi === testSbi
    )

    if (!processedItem) {
      throw new Error(
        `SBI ${testSbi} was not found in the processed results for ${tomorrowISO}`
      )
    }

    expect(processedItem.status).toBe('warning')
    expect(processedItem.body.dueDate).toBe(tomorrowHubFormat)
    expect(processedItem.body.sbi).toBe(testSbi)

    const { body: afterBody } =
      await GrantPaymentsService.getGrantPaymentById(testSbi)
    const recordInDb = afterBody.docs.find((r) => r.sbi === testSbi)

    const actualStatus = recordInDb.grants[0].payments[0].status
    console.log(
      `>>> Verification: Payment for ${tomorrowISO} status is now: ${actualStatus}`
    )
    expect(actualStatus).toBe('submitted')
  })
})
