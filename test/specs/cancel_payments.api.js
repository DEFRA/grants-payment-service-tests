import { expect } from '@wdio/globals'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import payload from '../data/grant-payment-payload_01.json' // Your JSON source
import { faker } from '@faker-js/faker'

describe('Grants Payment Service - Cancel Payments', () => {
  const sbi = faker.string.numeric(10)
  const frn = payload.frn

  it('should create, process one payment, and then cancel all', async () => {
    const setupPayload = {
      ...payload,
      sbi: sbi
    }
    // Step 1: Create
    await GrantPaymentsService.createGrantPayment(setupPayload)
    await browser.pause(2000)
    // Step 2: Process 1st quarter to change status to 'submitted'
    const firstQuarterDate = payload.grants[0].payments[0].dueDate
    await GrantPaymentsService.processPayments(firstQuarterDate)
    await browser.pause(2000)
    // Step 3: Call Cancel API using the FRN from the payload
    const cancelData = {
      sbi: sbi,
      frn: frn
    }
    const { statusCode } = await GrantPaymentsService.cancelPayment(cancelData)
    expect(statusCode).toBe(200)
    // Step 4: Verification
    await browser.pause(2000) // Wait for SQS
    const { body: record } = await GrantPaymentsService.getGrantPaymentById(sbi)
    const recordData = Array.isArray(record.docs) ? record.docs[0] : record
    const payments = recordData.grants[0].payments
    console.log('--- Verifying Payment Statuses ---')

    // 2. Assert the first payment (Index 0) stayed 'submitted'
    console.log(`Payment 1 (${payments[0].dueDate}): ${payments[0].status}`)
    expect(payments[0].status).toBe('submitted')

    // 3. Assert all subsequent payments are 'cancelled'
    // We start the loop at index 1
    for (let i = 1; i < payments.length; i++) {
      console.log(
        `Payment ${i + 1} (${payments[i].dueDate}): ${payments[i].status}`
      )
      expect(payments[i].status).toBe('cancelled')
    }
  })
})
