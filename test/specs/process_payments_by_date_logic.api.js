import { expect } from '@wdio/globals'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import payload from '../data/grant-payment-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Grants Payment Service - Process payments for 13th, 14th, 15th and ignore 16th', () => {
  const records = []
  let processingDate
  before(async () => {
    const year = new Date().getFullYear()
    // Random month between 1 and 12
    const randomMonth = faker.number.int({ min: 1, max: 12 })
    const month = String(randomMonth).padStart(2, '0')
    const paymentDates = [
      `${year}-${month}-13`, // should process
      `${year}-${month}-14`, // should process
      `${year}-${month}-15`, // should process
      `${year}-${month}-16` // should NOT process
    ]
    processingDate = `${year}-${month}-14`
    console.log('Payment Dates:', paymentDates)
    console.log('Processing Date:', processingDate)
    for (const dueDate of paymentDates) {
      const sbi = faker.string.numeric(10)
      const claimId = `R${Date.now()}${faker.number.int(99999)}`
      const testPayload = {
        ...payload,
        sbi,
        claimId,
        grants: payload.grants.map((grant) => ({
          ...grant,
          correlationId: faker.string.uuid(),
          payments: [
            {
              ...grant.payments[0],
              dueDate,
              correlationId: faker.string.uuid()
            }
          ]
        }))
      }
      const { statusCode } =
        await GrantPaymentsService.createGrantPaymentSQS(testPayload)
      expect(statusCode).toBe(200)
      records.push({
        sbi,
        claimId,
        dueDate
      })
    }
  })

  it('should process payments due on 13th, 14th and 15th but not 16th', async () => {
    const { statusCode, body } =
      await GrantPaymentsService.processPayments(processingDate)
    expect(statusCode).toBe(200)
    const processedSbis = body.result.map((item) => item.body.sbi)
    console.log('Processed SBIs:', processedSbis)
    expect(processedSbis).toContain(records[0].sbi) // 13th
    expect(processedSbis).toContain(records[1].sbi) // 14th
    expect(processedSbis).toContain(records[2].sbi) // 15th
    expect(processedSbis).not.toContain(records[3].sbi) // 16th
    const { body: paymentsBody } = await GrantPaymentsService.getGrantPayments()
    // Verify 13th, 14th, 15th are submitted
    for (let i = 0; i < 3; i++) {
      const record = paymentsBody.docs.find((r) => r.sbi === records[i].sbi)
      expect(record).toBeDefined()
      const paymentStatus = record.grants[0].payments[0].status
      console.log(
        `SBI ${records[i].sbi} (${records[i].dueDate}) status: ${paymentStatus}`
      )
      expect(paymentStatus).toBe('submitted')
    }
    // Verify 16th remains pending
    const futureRecord = paymentsBody.docs.find((r) => r.sbi === records[3].sbi)
    expect(futureRecord).toBeDefined()
    const futureStatus = futureRecord.grants[0].payments[0].status
    console.log(
      `SBI ${records[3].sbi} (${records[3].dueDate}) status: ${futureStatus}`
    )
    expect(futureStatus).toBe('pending')
  })

  after(async () => {
    for (const record of records) {
      try {
        await GrantPaymentsService.deleteGrantPaymentsById(record.sbi)
      } catch (error) {
        console.log(
          `Failed to delete record with SBI ${record.sbi}:`,
          error.message
        )
      }
    }
  })
})
