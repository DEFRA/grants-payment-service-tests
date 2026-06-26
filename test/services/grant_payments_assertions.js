import { expect } from '@wdio/globals'
import { getGrantPaymentById } from './grant_payments_service.js'

export async function expectCreatedSfiGrantPayment(statusCode, setupPayload) {
  expect(statusCode).toBe(200)

  const { statusCode: getStatusCode, body } = await getGrantPaymentById(
    setupPayload.sbi
  )

  expect(getStatusCode).toBe(200)
  expect(body).toBeDefined()
  expect(body.sbi).toBe(setupPayload.sbi)
  expect(Array.isArray(body.docs)).toBe(true)

  const record = body.docs.find(
    (doc) =>
      doc.sbi === setupPayload.sbi && doc.claimId === setupPayload.claimId
  )

  expect(record).toBeDefined()
  console.log('record : ', record)
  expect(record.sbi).toBe(setupPayload.sbi)
  expect(record.frn).toBe(setupPayload.frn)
  expect(record.grants).toHaveLength(setupPayload.grants.length)
  record.grants.forEach((grant, grantIndex) => {
    const expectedGrant = setupPayload.grants[grantIndex]
    expect(grant.sourceSystem).toBe(expectedGrant.sourceSystem)
    expect(grant.deliveryBody).toBe(expectedGrant.deliveryBody)
    expect(grant.fesCode).toBe(expectedGrant.fesCode)
    expect(grant.ledger).toBe(expectedGrant.ledger)
    expect(grant.payments).toHaveLength(expectedGrant.payments.length)
    grant.payments.forEach((payment) => {
      expect(payment.status).toBe('pending')
    })
  })

  return record
}
