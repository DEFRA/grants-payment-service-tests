import { expect } from '@wdio/globals'
import {
  createGrantPayment,
  getGrantPaymentById
} from '../services/grant_payments_service.js'
import payload from '../data/grant-payment-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Grants Payment Service - Get Grant Payment by SBI ID', () => {
  const sbi = faker.string.numeric(10)
  before(async () => {
    const setupPayload = {
      ...payload,
      sbi
    }
    console.log(`\n--- SETUP: Creating test record for GET by ID :: ${sbi} ---`)
    const { statusCode } = await createGrantPayment(setupPayload)
    if (statusCode !== 201) {
      throw new Error(`Setup failed: Expected 201 but got ${statusCode}`)
    }
  })

  it('Should fetch a single grant payment record by its sbiId', async () => {
    const { statusCode, body: json } = await getGrantPaymentById(sbi)
    expect(statusCode).toBe(200)
    const record = json.docs?.[0]
    expect(record).toBeDefined()
    console.log('SBI:', record.sbi)
    expect(record.sbi).toBe(sbi)
  })

  // it('Should return 404 for a non-existent claimId', async () => {
  //   const nonExistentId = 'NON_EXISTENT_ID_12345'
  //   const { statusCode } = await getGrantPaymentById(nonExistentId)
  //   expect(statusCode).toBe(200)
  // })
})
