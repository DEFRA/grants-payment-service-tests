import { expect } from '@wdio/globals'
import { createGrantPaymentSQS } from '../services/grant_payments_service.js'
import payload from '../data/grant-payment-payload_01.json'
import { faker } from '@faker-js/faker'
import * as GrantPaymentsService from '../services/grant_payments_service.js'

describe('Grants Payment Service - Create Grant Payments', () => {
  it('Should successfully create grant payments', async () => {
    const sbi = faker.string.numeric(10)
    const setupPayload = {
      ...payload,
      sbi,
      grants: payload.grants.map((grant) => ({
        ...grant,
        correlationId: faker.string.uuid(),
        payments: grant.payments.map((payment) => ({
          ...payment,
          correlationId: faker.string.uuid()
        }))
      }))
    }
    const { statusCode, body } = await createGrantPaymentSQS(setupPayload)
    expect(200).toBe(statusCode)
    expect(body.message).toBe('Test queue message posted')
    await GrantPaymentsService.deleteGrantPaymentsById(sbi)
  })
})
