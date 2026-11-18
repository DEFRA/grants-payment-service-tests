import { expect } from '@wdio/globals'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import { expectCreatedSfiGrantPayment } from '../helper/grant_payments_assertions.js'
import { generateTestIdentifiers } from '../helper/test_identifiers.js'
import { getNextMonthIsoPrefix } from '../helper/date_helper.js'
import payload from '../data/grant-payment-sfi-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Grants Payment Service - Process payments for 13th, 14th, 15th and ignore 16th', () => {
  const records = []
  let processingDate

  before(async () => {
    const month = getNextMonthIsoPrefix()

    const paymentDates = [
      `${month}-13`,
      `${month}-14`,
      `${month}-15`,
      `${month}-16`
    ]

    processingDate = `${month}-14`

    console.log('Payment Dates:', paymentDates)
    console.log('Processing Date:', processingDate)

    for (const dueDate of paymentDates) {
      const identifiers = generateTestIdentifiers()
      const { sbi } = identifiers
      const claimId = `R${Date.now()}${faker.number.int(99999)}`

      const testPayload = {
        ...payload,
        ...identifiers,
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

      records.push({
        sbi,
        claimId,
        dueDate,
        shouldProcess: dueDate !== `${month}-16`
      })

      const { statusCode } =
        await GrantPaymentsService.createGrantPaymentSQS(testPayload)

      await expectCreatedSfiGrantPayment(statusCode, testPayload)
    }
  })

  it('should process payments according to date logic', async () => {
    const { statusCode, body } =
      await GrantPaymentsService.processPayments(processingDate)

    expect(statusCode).toBe(200)

    console.log('=== Process Result Check ===')

    for (const record of records) {
      const processedItem = body.result.find(
        (item) => item.body.sbi === record.sbi
      )

      console.log({
        sbi: record.sbi,
        dueDate: record.dueDate,
        expectedToProcess: record.shouldProcess,
        foundInProcessResult: !!processedItem
      })

      if (record.shouldProcess) {
        expect(processedItem).toBeDefined()
      } else {
        expect(processedItem).toBeUndefined()
      }
    }

    const { body: paymentsBody } = await GrantPaymentsService.getGrantPayments()

    console.log('=== Database Status Check ===')

    for (const record of records) {
      const dbRecord = paymentsBody.docs.find((r) => r.sbi === record.sbi)

      expect(dbRecord).toBeDefined()

      const paymentStatus = dbRecord.grants[0].payments[0].status

      console.log({
        sbi: record.sbi,
        dueDate: record.dueDate,
        expectedToProcess: record.shouldProcess,
        actualStatus: paymentStatus
      })

      if (record.shouldProcess) {
        expect(paymentStatus).toBe('submitted')
      } else {
        expect(paymentStatus).toBe('pending')
      }
    }
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
