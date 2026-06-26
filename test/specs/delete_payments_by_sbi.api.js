import { expect } from '@wdio/globals'
import * as GrantPaymentsService from '../services/grant_payments_service.js'
import { expectCreatedSfiGrantPayment } from '../services/grant_payments_assertions.js'
import payload from '../data/grant-payment-sfi-payload_01.json'
import { faker } from '@faker-js/faker'

describe('Delete Grant Payments By SBI', () => {
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

  it('Should delete grant payments for the supplied SBI', async () => {
    const { statusCode, body } =
      await GrantPaymentsService.deleteGrantPaymentsById(sbi)
    expect(statusCode).toBe(200)
    expect(body).toMatchObject({
      sbi,
      deletedCount: 1
    })
    const { body: paymentsBody } =
      await GrantPaymentsService.getGrantPaymentById(sbi)
    expect(paymentsBody).toBeDefined()
    expect(paymentsBody.sbi).toBe(sbi)
    expect(paymentsBody.docs).toEqual([])
    expect(paymentsBody.docs).toHaveLength(0)
    await GrantPaymentsService.deleteGrantPaymentsById(sbi)
  })
})
