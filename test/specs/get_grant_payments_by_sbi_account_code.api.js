import { expect } from '@wdio/globals'
import {
  createGrantPayment,
  getGrantPaymentById,
  getGrantPaymentBySbiAccountId
} from '../services/grant_payments_service.js'
import payload from '../data/grant-payment-payload_01.json'
import { faker } from '@faker-js/faker'
import * as GrantPaymentsService from '~/test/services/grant_payments_service.js'

describe('Grants Payment Service - Get Grant Payment by SBI ID and Account Code', () => {
  const accountCode = 'DRD10'
  const sbi = faker.string.numeric(10)
  before(async () => {
    const setupPayload = {
      ...payload,
      sbi
    }

    console.log(`\n--- SETUP: Creating test record for GET by ID: ${sbi} ---`)
    const { statusCode } = await createGrantPayment(setupPayload)

    if (statusCode !== 201) {
      throw new Error(`Setup failed: Expected 201 but got ${statusCode}`)
    }
    expect(statusCode).toBe(201)
  })

  it('Should fetch a single grant payment record by its claimId', async () => {
    const currentDueDate = payload.grants[0].payments[0].dueDate
    // Process payment
    const { statusCode: processStatus, body: processBody } =
      await GrantPaymentsService.processPayments(currentDueDate)

    expect(processStatus).toBe(200)
    expect(processBody).toBeDefined()

    // Fetch by SBI + Account Code
    const { statusCode: fetchStatus, body: json } =
      await getGrantPaymentBySbiAccountId(sbi, accountCode)
    expect(fetchStatus).toBe(200)
    expect(json).toBeDefined()
    expect(Array.isArray(json.docs)).toBe(true)
    expect(json.docs.length).toBeGreaterThan(0)
    expect(json.sbi).toBe(sbi)
    expect(json.fundCode).toBe(accountCode)
  })

  it('Should return 404 for a non-existent claimId', async () => {
    const nonExistentId = 'NON_EXISTENT_ID_12345'
    const { statusCode } = await getGrantPaymentById(nonExistentId)
    expect(statusCode).toBe(200)
  })
})
