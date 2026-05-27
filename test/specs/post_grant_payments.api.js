import { expect } from '@wdio/globals'
import { createGrantPayment } from '../services/grant_payments_service.js'
import payload from '../data/grant-payment-payload_01.json'
import { faker } from '@faker-js/faker'

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
    const { statusCode, body } = await createGrantPayment(setupPayload)
    expect([201]).toContain(statusCode)
    expect(body.message).toBe('Grant payments created')
    expect(body.id).toBeDefined()
  })
})
