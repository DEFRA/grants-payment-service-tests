import { expect } from '@wdio/globals'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import { expectCreatedSfiGrantPayment } from '../services/grant_payments_assertions.js'
import payload from '../data/grant-payment-sfi-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Grant Payments Service - Process Payments By SBI', () => {
  let sbi
  let claimId
  let setupPayload
  before(async () => {
    sbi = faker.string.numeric(10)
    claimId = `R${Date.now()}`
    setupPayload = {
      ...payload,
      sbi,
      claimId,
      grants: payload.grants.map((grant) => ({
        ...grant,
        correlationId: faker.string.uuid(),
        payments: grant.payments.map((payment) => ({
          ...payment,
          correlationId: faker.string.uuid()
        }))
      }))
    }
    const { statusCode } =
      await GrantPaymentsService.createGrantPaymentSQS(setupPayload)
    await expectCreatedSfiGrantPayment(statusCode, setupPayload)
  })

  it('Should process all payments for the supplied SBI', async () => {
    const payments = setupPayload.grants[0].payments
    const grant = setupPayload.grants[0]
    // Verify initial status
    const { statusCode: beforeStatus, body: beforeBody } =
      await GrantPaymentsService.getGrantPaymentById(sbi)
    expect(beforeStatus).toBe(200)
    expect(beforeBody.docs).toHaveLength(1)
    const recordBefore = beforeBody.docs[0]
    recordBefore.grants[0].payments.forEach((payment) => {
      expect(payment.status).toBe('pending')
    })

    // Process payments by SBI
    const { statusCode, body: processResult } =
      await GrantPaymentsService.processPaymentsBySbi(sbi)

    expect(statusCode).toBe(200)
    expect(processResult).toBeDefined()
    expect(processResult.result).toBeDefined()
    expect(processResult.result).toHaveLength(payments.length)

    // Verify every payment was returned
    const processedCorrelationIds = processResult.result.map(
      (item) => item.body.correlationId
    )

    expect(processedCorrelationIds).toEqual(
      expect.arrayContaining(payments.map((payment) => payment.correlationId))
    )

    // Verify each processed payment
    payments.forEach((payment, index) => {
      const processedItem = processResult.result.find(
        (item) => item.body.correlationId === payment.correlationId
      )

      expect(processedItem).toBeDefined()

      // Response assertions
      expect(processedItem.status).toBe('warning')

      expect(processedItem.message).toContain(
        'Payment Hub feature flag is disabled'
      )

      expect(processedItem.response).toBeNull()

      // Due date format validation
      const expectedDueDate = new Date(payment.dueDate).toLocaleDateString(
        'en-GB',
        {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }
      )

      // Body assertions
      expect(processedItem.body).toMatchObject({
        sourceSystem: 'FPTT',
        ledger: 'AP',
        deliveryBody: 'RP00',
        frn: payload.frn,
        sbi,
        fesCode: 'FALS_FPTT',
        marketingYear: '2026',
        paymentRequestNumber: 1,
        agreementNumber: grant.agreementNumber.replace('FPTT', ''),
        contractNumber: claimId,
        currency: 'GBP',
        dueDate: expectedDueDate,
        correlationId: payment.correlationId,
        value: '-68.21',
        annualValue: '272.84'
      })

      expect(processedItem.body.invoiceNumber).toBe(
        `R00000036-V001Q${index + 1}`
      )

      // Invoice lines
      expect(processedItem.body.invoiceLines).toHaveLength(2)

      expect(processedItem.body.invoiceLines[0]).toMatchObject({
        schemeCode: '84011',
        accountCode: 'SOS710',
        fundCode: 'DRD10',
        agreementNumber: grant.agreementNumber.replace('FPTT', ''),
        description: 'G00 - Gross Value of Claim',
        value: '0.21',
        deliveryBody: 'RP00',
        marketingYear: '2026'
      })

      expect(processedItem.body.invoiceLines[1]).toMatchObject({
        schemeCode: '84011',
        accountCode: 'SOS710',
        fundCode: 'DRD10',
        agreementNumber: grant.agreementNumber.replace('FPTT', ''),
        description: 'G00 - Gross Value of Claim',
        value: '68.00',
        deliveryBody: 'RP00',
        marketingYear: '2026'
      })

      console.log(`Processed payment ${processedItem.body.invoiceNumber}`)
    })

    // Verify statuses updated
    const { statusCode: afterStatus, body: afterBody } =
      await GrantPaymentsService.getGrantPaymentById(sbi)

    expect(afterStatus).toBe(200)
    expect(afterBody.docs).toHaveLength(1)

    const recordAfter = afterBody.docs[0]
    const updatedPayments = recordAfter.grants[0].payments

    expect(updatedPayments).toHaveLength(payments.length)

    updatedPayments.forEach((payment, index) => {
      console.log(`Payment ${index + 1} status: ${payment.status}`)
      expect(payment.status).toBe('submitted')
      expect(payment.status).not.toBe('pending')
    })
    await GrantPaymentsService.deleteGrantPaymentsById(sbi)
  })
})
