import { expect } from '@wdio/globals'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import payload from '../data/grant-payment-wmp-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Grants Payment Service - Store and Process Payments for WMP', () => {
  let testClaimId
  let setupPayload
  const sbi = faker.string.numeric(10)
  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  before(async () => {
    testClaimId = `R${Date.now()}`
    const tomorrowDate = getTomorrowDate()
    setupPayload = {
      ...payload,
      sbi,
      claimId: testClaimId,
      grants: [
        {
          ...payload.grants[0],
          correlationId: faker.string.uuid(),
          payments: [
            {
              ...payload.grants[0].payments[0],
              dueDate: tomorrowDate,
              correlationId: faker.string.uuid()
            }
          ]
        }
      ]
    }
    const { statusCode } =
      await GrantPaymentsService.createGrantPaymentSQS(setupPayload)
    expect(statusCode).toBe(200)
  })

  after(async () => {
    await GrantPaymentsService.deleteGrantPaymentsById(sbi)
  })

  it('Should process a WMP payment and generate the correct Payment Hub payload', async () => {
    const payment = setupPayload.grants[0].payments[0]
    const grant = setupPayload.grants[0]
    const currentDueDate = payment.dueDate
    console.log('currentDueDate', currentDueDate)
    const { body: beforeBody } =
      await GrantPaymentsService.getGrantPaymentById(sbi)
    const recordBefore = beforeBody.docs.find((r) => r.sbi === sbi)
    expect(recordBefore).toBeDefined()
    expect(recordBefore.grants[0].payments[0].status).toBe('pending')

    // Process payment
    const { statusCode, body: processResult } =
      await GrantPaymentsService.processPayments(currentDueDate)
    expect(statusCode).toBe(200)
    const processedItem = processResult.result.find(
      (item) => item.body.sbi === sbi
    )
    expect(processedItem).toBeDefined()
    expect(processedItem.status).toBe('warning')
    expect(processedItem.message).toContain(
      'Payment Hub feature flag is disabled'
    )
    expect(processedItem.response).toBeNull()
    const hubBody = processedItem.body
    expect(hubBody).toMatchObject({
      sourceSystem: 'WMP',
      ledger: 'AP',
      deliveryBody: 'RP10',
      invoiceNumber: 'R00000001-V001',
      frn: payload.frn,
      sbi,
      fesCode: 'FALS_WMP',
      marketingYear: '2026',
      paymentRequestNumber: 1,
      agreementNumber: grant.agreementNumber.replace('WPM', ''),
      contractNumber: testClaimId,
      currency: 'GBP',
      remittanceDescription: 'Woodland Management Plan Payment',
      correlationId: payment.correlationId,
      value: '-12.34'
    })
    expect(hubBody.invoiceNumber).toBe(`R00000001-V001`)
    // Single invoice line
    expect(hubBody.invoiceLines).toHaveLength(1)

    expect(hubBody.invoiceLines[0]).toMatchObject({
      schemeCode: '51840',
      accountCode: 'SOS710',
      fundCode: 'DRD10',
      agreementNumber: grant.agreementNumber.replace('WPM', ''),
      description: 'G00 - Gross Value of Claim',
      value: '12.34',
      deliveryBody: 'RP10',
      marketingYear: '2026'
    })
    // Verify payment status updated
    const { body: afterBody } = await GrantPaymentsService.getGrantPayments()
    const recordAfter = afterBody.docs.find((r) => r.sbi === sbi)
    expect(recordAfter).toBeDefined()
    expect(recordAfter.grants[0].payments[0].status).toBe('submitted')
  })
})
