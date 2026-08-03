import { expect } from '@wdio/globals'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import { expectCreatedSfiGrantPayment } from '../helper/grant_payments_assertions.js'
import { replaceDatesWithFuture } from '../helper/date_helper.js'
import payloadData from '../data/grant-payment-sfi-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Grants Payment Service - Process Payments', () => {
  let testClaimId
  let setupPayload

  const sbi = faker.string.numeric(10)

  const formatToHubDate = (isoDate) => {
    const [y, m, d] = isoDate.split('-')
    return `${d}/${m}/${y}`
  }

  before(async () => {
    testClaimId = `R${Date.now()}`

    const payload = replaceDatesWithFuture(payloadData)
    setupPayload = {
      ...payload,
      sbi,
      claimId: testClaimId,
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

  // Iterate through dynamic payload payments
  setupPayload?.grants?.[0]?.payments?.forEach((payment, index) => {
    const currentDueDate = payment.dueDate
    const hubDisplayDate = formatToHubDate(currentDueDate)

    it(`Payment ${index + 1}: Should transition status for Due Date ${currentDueDate}`, async () => {
      // 1. Verify specific payment is pending before processing
      const { body: beforeBody } = await GrantPaymentsService.getGrantPayments()

      const recordBefore = beforeBody.docs.find((r) => r.sbi === sbi)

      if (recordBefore) {
        console.log('Matched Record', JSON.stringify(recordBefore, null, 2))
      } else {
        console.log(
          `ERROR: Record with SBI ${sbi} and ClaimId ${testClaimId} not found in daily payments!`
        )
      }

      expect(recordBefore.grants[0].payments[index].status).toBe('pending')

      // 2. Process payment for current due date
      const { statusCode, body: processResult } =
        await GrantPaymentsService.processPayments(currentDueDate)

      expect(statusCode).toBe(200)

      console.log('processResult', processResult)

      // 3. Validate processed payload
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
          `ERROR: Record with SBI ${sbi} and ClaimId ${testClaimId} not found in processed payments!`
        )
      }

      expect(processedItem).toBeDefined()

      // Root level assertions
      expect(processedItem.status).toBe('warning')

      expect(processedItem.message).toContain(
        'Payment Hub feature flag is disabled'
      )

      expect(processedItem.response).toBeNull()

      // Dynamic correlationId
      const expectedPaymentCorrelationId =
        setupPayload.grants[0].payments[index].correlationId

      const expectedGrant = setupPayload.grants[0]

      const hubBody = processedItem.body

      // Body assertions
      expect(hubBody).toMatchObject({
        sourceSystem: 'FPTT',
        ledger: 'AP',
        deliveryBody: 'RP00',
        invoiceNumber: 'R00000036-V001Q' + (index + 1),
        frn: '1102285668',
        sbi,
        fesCode: 'FALS_FPTT',
        marketingYear: '2026',
        paymentRequestNumber: 1,
        agreementNumber: expectedGrant.agreementNumber.replace('FPTT', ''),
        contractNumber: testClaimId,
        currency: 'GBP',
        dueDate: hubDisplayDate,
        remittanceDescription: 'Farm Payments Technical Test Payment',
        correlationId: expectedPaymentCorrelationId,
        value: '-68.21',
        annualValue: '272.84'
      })

      // Invoice lines assertions
      expect(hubBody.invoiceLines).toHaveLength(2)

      // Line 1
      expect(hubBody.invoiceLines[0]).toMatchObject({
        schemeCode: '84011',
        accountCode: 'SOS710',
        fundCode: 'DRD10',
        agreementNumber: expectedGrant.agreementNumber.replace('FPTT', ''),
        description: 'G00 - Gross Value of Claim',
        value: '0.21',
        deliveryBody: 'RP00',
        marketingYear: '2026'
      })

      // Line 2
      expect(hubBody.invoiceLines[1]).toMatchObject({
        schemeCode: '84011',
        accountCode: 'SOS710',
        fundCode: 'DRD10',
        agreementNumber: expectedGrant.agreementNumber.replace('FPTT', ''),
        description: 'G00 - Gross Value of Claim',
        value: '68.00',
        deliveryBody: 'RP00',
        marketingYear: '2026'
      })

      // 4. Verify payment status updated
      const { body: afterBody } = await GrantPaymentsService.getGrantPayments()

      const recordAfter = afterBody.docs.find((r) => r.sbi === sbi)

      const specificPaymentStatus = recordAfter.grants[0].payments[index].status

      console.log(
        `Quarter ${index + 1} (${currentDueDate}): status moved to ${specificPaymentStatus}`
      )

      expect(specificPaymentStatus).toBe('submitted')

      // 5. Verify next payment remains pending
      if (index < setupPayload.grants[0].payments.length - 1) {
        const nextPaymentStatus =
          recordAfter.grants[0].payments[index + 1].status

        expect(nextPaymentStatus).toBe('pending')
      }
      await GrantPaymentsService.deleteGrantPaymentsById(sbi)
    })
  })
})
