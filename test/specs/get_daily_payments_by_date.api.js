import { expect } from '@wdio/globals'
import {
  createGrantPayment,
  getDailyPayments
} from '../services/grant_payments_service.js'
import payload from '../data/grant-payment-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Grants Payment Service - Get Daily Payments', () => {
  let testClaimId
  let targetDate
  const sbi = faker.string.numeric(10)

  before(async () => {
    testClaimId = `R${Date.now()}`
    targetDate = payload.grants[0].payments[0].dueDate
    const setupPayload = {
      ...payload,
      claimId: testClaimId,
      sbi
    }

    const { statusCode } = await createGrantPayment(setupPayload)
    if (statusCode !== 201) {
      throw new Error(`Setup failed: Expected 201 but got ${statusCode}`)
    }
  })

  it('Should find the created record within the daily payments for the scheduled date', async () => {
    // 1. Act: Fetch daily payments for the target date
    const { statusCode, body } = await getDailyPayments(targetDate)

    // 2. Assert: Base structure
    expect(statusCode).toBe(200)
    expect(body.date).toBe(targetDate)
    expect(Array.isArray(body.docs)).toBe(true)

    // 3. Assert: Find our specific record in the 'docs' array
    const createdDoc = body.docs.find(
      (doc) => doc.sbi === sbi && doc.claimId === testClaimId
    )
    if (createdDoc) {
      console.log('Matched Record', JSON.stringify(createdDoc, null, 2))
    } else {
      console.log(
        `ERROR: Record with SBI ${sbi} and ClaimId ${testClaimId} not found in daily payments!`
      )
    }
    console.log(`----------------------------------\n`)
    expect(createdDoc).toBeDefined()
    expect(createdDoc.frn).toBe(payload.frn)

    // 4. Assert: Validate the specific payment inside the doc matches our target date
    const grant = createdDoc.grants[0]

    // In daily-payments, the record is returned because at least one payment matches the date
    const matchingPayment = grant.payments.find((p) => p.dueDate === targetDate)
    if (matchingPayment) {
      console.log('Matched Record', JSON.stringify(matchingPayment, null, 2))
    } else {
      console.log(
        `ERROR: Record with SBI ${sbi} and ClaimId ${testClaimId} not found in daily payments!`
      )
    }

    expect(matchingPayment).toBeDefined()
    expect(matchingPayment.status).toBe('pending')

    // Verify the amount decimal structure matches the payload
    expect(matchingPayment.totalAmountPence).toEqual({
      $numberDecimal: payload.grants[0].payments[0].totalAmountPence
    })

    // 5. Assert: Invoice Lines integrity
    const expectedLines = payload.grants[0].payments[0].invoiceLines
    expect(matchingPayment.invoiceLines).toHaveLength(expectedLines.length)

    matchingPayment.invoiceLines.forEach((line, index) => {
      expect(line.schemeCode).toBe(expectedLines[index].schemeCode)
      expect(line.amountPence).toEqual({
        $numberDecimal: expectedLines[index].amountPence
      })
      expect(line._id).toBeDefined()
    })
  })
})
