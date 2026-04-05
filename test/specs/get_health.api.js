import { expect } from '@wdio/globals'
import { getHealth } from '../services/grant_payments_service.js'

describe('Grants Payment Service - Health API', () => {
  it('Should return full health status and correct configuration', async () => {
    const { statusCode, body } = await getHealth()
    expect(statusCode).toBe(200)
    expect(body.message).toBe('success')
    expect(body.version).toBeDefined()
    expect(typeof body.version).toBe('string')
    expect(body.featureFlags).toBeDefined()
    expect(body.featureFlags.testEndpoints).toBe(true)
    expect(body.featureFlags.isPaymentHubEnabled).toBe(false)
  })

  it('Should have the expected schema structure', async () => {
    const { body } = await getHealth()
    expect(body).toMatchObject({
      message: expect.any(String),
      version: expect.any(String),
      featureFlags: {
        testEndpoints: expect.any(Boolean),
        isPaymentHubEnabled: expect.any(Boolean)
      }
    })
  })
})
