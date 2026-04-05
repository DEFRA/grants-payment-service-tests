import { expect } from '@wdio/globals'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import payload from '../data/grant-payment-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Grants Payment Service - Process Payments', () => {
  let testClaimId
  const sbi = faker.string.numeric(10)
  const formatToHubDate = (isoDate) => {
    const [y, m, d] = isoDate.split('-')
    return `${d}/${m}/${y}`
  }

  before(async () => {
    testClaimId = `R${Date.now()}`
    const setupPayload = { ...payload, claimId: testClaimId, sbi }
    const { statusCode } =
      await GrantPaymentsService.createGrantPayment(setupPayload)
    expect(statusCode).toBe(201)
  })

  // We iterate through each payment in the payload (4 total)
  payload.grants[0].payments.forEach((payment, index) => {
    const currentDueDate = payment.dueDate
    const hubDisplayDate = formatToHubDate(currentDueDate)

    it(`Payment ${index + 1}: Should transition status for Due Date ${currentDueDate}`, async () => {
      // 1. Verify specific payment is 'pending' before we start
      const { body: beforeBody } = await GrantPaymentsService.getGrantPayments()
      const recordBefore = beforeBody.find((r) => r.sbi === sbi)
      if (recordBefore) {
        console.log('Matched Record', JSON.stringify(recordBefore, null, 2))
      } else {
        console.log(
          `ERROR: Record with SBI ${sbi} and ClaimId ${testClaimId} not found in daily payments!`
        )
      }
      expect(recordBefore.grants[0].payments[index].status).toBe('pending')

      // 2. Act: Process payment for this specific quarter
      const { statusCode, body: processResult } =
        await GrantPaymentsService.processPayments(currentDueDate)

      expect(statusCode).toBe(200)

      // 3. Validate Hub Payload matches this specific payment
      const processedItem = processResult.result.find(
        (item) => item.body.sbi === sbi
      )
      if (processedItem) {
        console.log(
          'processedPayLoad Matched Record',
          JSON.stringify(processedItem, null, 2)
        )
      } else {
        console.log(
          `ERROR: Record with SBI ${sbi} and ClaimId ${testClaimId} not found in daily payments!`
        )
      }
      expect(processedItem).toBeDefined()

      // Ensure the record was found
      expect(processedItem).toBeDefined()

      // 1. Root Level Assertions
      expect(processedItem.status).toBe('warning')
      expect(processedItem.message).toContain(
        'Payment Hub feature flag is disabled'
      )
      expect(processedItem.response).toBeNull()

      // 2. Body level - Full Object Match
      const hubBody = processedItem.body
      expect(hubBody).toMatchObject({
        sourceSystem: 'FPTT',
        ledger: 'AP',
        deliveryBody: 'RP00',
        invoiceNumber: 'R00000036-V001Q3',
        frn: payload.frn,
        sbi,
        fesCode: 'FALS_FPTT',
        marketingYear: '2026',
        paymentRequestNumber: 1,
        agreementNumber: payload.grants[0].agreementNumber,
        contractNumber: testClaimId,
        currency: 'GBP',
        dueDate: hubDisplayDate,
        remittanceDescription: 'Farm Payments Technical Test Payment',
        correlationId: 'f7297a7d-15d1-407d-a246-e2988680b93d',
        value: '-272.84'
      })

      // 3. Nested Invoice Lines Assertions
      expect(hubBody.invoiceLines).toHaveLength(2)

      // Line 1: Parcel Record
      expect(hubBody.invoiceLines[0]).toMatchObject({
        schemeCode: '84011',
        accountCode: 'DRD10',
        fundCode: 'SOS710',
        agreementNumber: payload.grants[0].agreementNumber,
        description: expect.stringContaining('Parcel: 6898: Assess moorland'),
        value: '0.21',
        deliveryBody: 'RP00',
        marketingYear: '2026'
      })

      // Line 2: One-off Payment
      expect(hubBody.invoiceLines[1]).toMatchObject({
        schemeCode: '84011',
        accountCode: 'DRD10',
        fundCode: 'SOS710',
        agreementNumber: payload.grants[0].agreementNumber,
        description: expect.stringContaining(
          'One-off payment per agreement per year'
        ),
        value: '68.00',
        deliveryBody: 'RP00',
        marketingYear: '2026'
      })

      // 4. Verify Status Change in Database for THIS payment only
      const { body: afterBody } = await GrantPaymentsService.getGrantPayments()
      const recordAfter = afterBody.find((r) => r.sbi === sbi)
      const specificPaymentStatus = recordAfter.grants[0].payments[index].status
      console.log(
        `Quarter ${index + 1} (${currentDueDate}): status moved to ${specificPaymentStatus}`
      )
      expect(specificPaymentStatus).toBe('submitted')

      // 5. Optional: Verify other payments (if any are future) are still 'pending'
      if (index < payload.grants[0].payments.length - 1) {
        const nextPaymentStatus =
          recordAfter.grants[0].payments[index + 1].status
        expect(nextPaymentStatus).toBe('pending')
      }
    })
  })
})
