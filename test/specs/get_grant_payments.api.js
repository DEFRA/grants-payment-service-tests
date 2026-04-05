import { expect } from '@wdio/globals'
import {
  createGrantPayment,
  getGrantPayments
} from '../services/grant_payments_service.js'
import payload from '../data/grant-payment-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Grants Payment Service - Get Grant Payments', () => {
  let testClaimId
  const sbi = faker.string.numeric(10)

  before(async () => {
    testClaimId = `R${Date.now()}`

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

  it('Should validate full structure and exact values', async () => {
    const { statusCode, body: json } = await getGrantPayments()

    expect(statusCode).toBe(200)
    expect(Array.isArray(json)).toBe(true)

    const createdRecord = json.find((record) => record.claimId === testClaimId)
    if (createdRecord) {
      console.log('Matched Record', JSON.stringify(createdRecord, null, 2))
    } else {
      console.log(
        `ERROR: Record with SBI ${sbi} and ClaimId ${testClaimId} not found in daily payments!`
      )
    }
    expect(createdRecord).toBeDefined()

    // Top-level checks
    expect(createdRecord.claimId).toBe(testClaimId)
    expect(createdRecord.sbi).toBe(sbi)
    expect(createdRecord.frn).toBe(payload.frn)

    expect(createdRecord._id).toBeDefined()
    expect(createdRecord.createdAt).toBeDefined()
    expect(createdRecord.updatedAt).toBeDefined()
    expect(createdRecord.__v).toBeDefined()

    // Grants
    expect(createdRecord.grants).toHaveLength(1)
    const grant = createdRecord.grants[0]
    const expectedGrant = payload.grants[0]
    expect(grant.sourceSystem).toBe(expectedGrant.sourceSystem)
    expect(grant.paymentRequestNumber).toBe(expectedGrant.paymentRequestNumber)
    expect(grant.correlationId).toBe(expectedGrant.correlationId)
    expect(grant.invoiceNumber).toBe(expectedGrant.invoiceNumber)
    expect(grant.originalInvoiceNumber).toBe(
      expectedGrant.originalInvoiceNumber
    )
    expect(grant.agreementNumber).toBe(expectedGrant.agreementNumber)
    expect(grant.currency).toBe(expectedGrant.currency)
    expect(grant.marketingYear).toBe(expectedGrant.marketingYear)
    expect(grant.deliveryBody).toBe(expectedGrant.deliveryBody)

    // Decimal check
    expect(grant.totalAmountPence).toEqual({
      $numberDecimal: expectedGrant.totalAmountPence
    })

    // Payments
    expect(grant.payments).toHaveLength(4)
    grant.payments.forEach((payment, i) => {
      const expectedPayment = expectedGrant.payments[i]

      expect(payment.dueDate).toBe(expectedPayment.dueDate)
      expect(payment.status).toBe(expectedPayment.status)

      expect(payment.totalAmountPence).toEqual({
        $numberDecimal: expectedPayment.totalAmountPence
      })

      expect(payment.invoiceLines).toHaveLength(
        expectedPayment.invoiceLines.length
      )
      // Invoice lines
      payment.invoiceLines.forEach((line, j) => {
        const expectedLine = expectedPayment.invoiceLines[j]
        expect(line.schemeCode).toBe(expectedLine.schemeCode)
        expect(line.description).toBe(expectedLine.description)
        expect(line.deliveryBody).toBe(expectedGrant.deliveryBody)

        expect(line.amountPence).toEqual({
          $numberDecimal: expectedLine.amountPence
        })
        // static fields
        expect(line.accountCode).toBeDefined()
        expect(line.fundCode).toBeDefined()
        expect(line._id).toBeDefined()
      })
      expect(payment._id).toBeDefined()
    })
    expect(grant._id).toBeDefined()
  })
})
