import { expect } from '@wdio/globals'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import { expectCreatedSfiGrantPayment } from '../helper/grant_payments_assertions.js'
import payloadData from '../data/grant-payment-sfi-payload_02.json'
import { faker } from '@faker-js/faker'
import { replaceDatesWithFuture } from '../helper/date_helper.js'

describe('Grants Payment Service - Store and Process Payments for SFI - 1 payment', () => {
  let testClaimId
  let setupPayload
  const sbi = faker.string.numeric(10)
  const formatToHubDate = (isoDate) => {
    const [y, m, d] = isoDate.split('-')
    return `${d}/${m}/${y}`
  }
  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  before(async () => {
    const payload = replaceDatesWithFuture(payloadData)
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
    await expectCreatedSfiGrantPayment(statusCode, setupPayload)
  })

  after(async () => {
    await GrantPaymentsService.deleteGrantPaymentsById(sbi)
  })

  it('Should process a WMP payment and generate the correct Payment Hub payload', async () => {
    const payment = setupPayload.grants[0].payments[0]
    const grant = setupPayload.grants[0]
    const currentDueDate = payment.dueDate
    console.log('currentDueDate', currentDueDate)
    const hubDisplayDate = formatToHubDate(currentDueDate)
    const { body: beforeBody } =
      await GrantPaymentsService.getGrantPaymentById(sbi)
    const recordBefore = beforeBody.docs.find((r) => r.sbi === sbi)
    expect(recordBefore).toBeDefined()
    expect(recordBefore.grants[0].payments[0].status).toBe('pending')

    // Process payment
    const { statusCode, body: processResult } =
      await GrantPaymentsService.processPayments(currentDueDate)

    expect(statusCode).toBe(200)
    expect(processResult.message).toContain(
      `Triggered daily payment processing`
    )

    const processedItem = processResult.result.find(
      (item) => item.body.sbi === sbi
    )

    expect(processedItem).toBeDefined()
    const hubBody = processedItem.body

    const payload = replaceDatesWithFuture(payloadData)
    expect(hubBody).toMatchObject({
      sourceSystem: 'FPTT',
      ledger: 'AP',
      deliveryBody: 'RP00',
      frn: payload.frn,
      sbi,
      fesCode: 'FALS_FPTT',
      marketingYear: '2026',
      paymentRequestNumber: 1,
      agreementNumber: grant.agreementNumber.replace('FPTT', ''),
      contractNumber: testClaimId,
      currency: 'GBP',
      dueDate: hubDisplayDate,
      remittanceDescription: 'Farm Payments Technical Test Payment',
      correlationId: payment.correlationId,
      value: '-0.21',
      annualValue: '272.84'
    })

    // Invoice number should contain the generated claim id
    expect(hubBody.invoiceNumber).toBe(`R00000036-V001Q1`)

    // One invoice line
    expect(hubBody.invoiceLines).toHaveLength(1)

    expect(hubBody.invoiceLines[0]).toMatchObject({
      schemeCode: '84011',
      accountCode: 'SOS710',
      fundCode: 'DRD10',
      agreementNumber: grant.agreementNumber.replace('FPTT', ''),
      description: 'G00 - Gross Value of Claim',
      value: '0.21',
      deliveryBody: 'RP00',
      marketingYear: '2026'
    })

    // Database ids returned
    expect(processedItem.db).toMatchObject({
      paymentId: expect.any(String),
      docId: expect.any(String)
    })

    // Verify payment status updated
    const { body: afterBody } =
      await GrantPaymentsService.getGrantPaymentById(sbi)

    const recordAfter = afterBody.docs.find((r) => r.sbi === sbi)

    expect(recordAfter).toBeDefined()
    expect(recordAfter.grants[0].payments[0].status).toBe('submitted')
  })
})
