import { request } from 'undici'

const endpoint = 'api/test/grant-payments'
const endpointSQS = 'api/test'
const getBaseUrl = () => browser.options.baseUrl || process.env.BASE_URL

/**
 * Internal helper to handle common headers
 */
function getHeaders() {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Encoding': '*'
  }
  if (process.env.USER_TOKEN) {
    headers['x-api-key'] = process.env.USER_TOKEN
  }
  return headers
}

/**
 * GET Health Status
 */
export async function getHealth() {
  const url = `${getBaseUrl()}health`

  console.log('\n>>>>> OUTGOING REQUEST : health:GET >>>>>')
  console.log(`URL: ${url}`)

  const { statusCode, body } = await request(url, {
    method: 'GET',
    headers: getHeaders()
  })

  const responseData = await body.json()
  console.log('<<<<< INCOMING RESPONSE : health:GET <<<<<')
  console.log(`STATUS: ${statusCode}`)
  console.log(`BODY:   ${JSON.stringify(responseData)}\n`)

  return { statusCode, body: responseData }
}

/**
 * Create Grant Payment direct DB
 */
export async function createGrantPaymentDirect(payload) {
  const url = `${getBaseUrl()}${endpoint}`

  console.log('\n>>>>> OUTGOING REQUEST : grant-payments:POST : Create >>>>>')
  console.log(`URL: ${url}`)
  console.log(`PAYLOAD: ${JSON.stringify(payload, null, 2)}`)

  const { statusCode, body } = await request(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  })

  const responseData = await body.json()
  console.log('<<<<< INCOMING RESPONSE : grant-payments:POST <<<<<')
  console.log(`STATUS: ${statusCode}`)
  console.log(`BODY: ${JSON.stringify(responseData, null, 2)}\n`)

  return { statusCode, body: responseData }
}

/**
 * Create Grant Payment via Queue
 */
export async function createGrantPaymentSQS(payload) {
  const url = `${getBaseUrl()}${endpointSQS}/queue-message/gps__sqs__create_payment.fifo`

  const queuePayload = {
    type: 'create_payment',
    data: payload
  }

  console.log(
    '\n>>>>> OUTGOING REQUEST : queue-message:POST : create_payment >>>>>'
  )
  console.log(`URL: ${url}`)
  console.log(`PAYLOAD: ${JSON.stringify(queuePayload, null, 2)}`)

  const { statusCode, body } = await request(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(queuePayload)
  })

  const responseData = await body.json()

  console.log(
    '<<<<< INCOMING RESPONSE : queue-message:POST : create_payment <<<<<'
  )
  console.log(`STATUS: ${statusCode}`)
  console.log(`BODY: ${JSON.stringify(responseData, null, 2)}\n`)
  await new Promise((resolve) => setTimeout(resolve, 5000))
  return {
    statusCode,
    body: responseData
  }
}

/**
 * Get Grant Payments
 */
export async function getGrantPayments() {
  const url = `${getBaseUrl()}${endpoint}`

  console.log('\n>>>>> OUTGOING REQUEST : grant-payments:GET >>>>>')
  console.log(`URL: ${url}`)

  const { statusCode, body } = await request(url, {
    method: 'GET',
    headers: getHeaders()
  })

  const responseData = await body.json()
  // console.log(
  //   `getGrantPayments BODY: ${JSON.stringify(responseData, null, 2)}\n`
  // )
  if (Array.isArray(responseData)) {
    console.log(`RECORDS: ${responseData.length}`)
  }
  console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n')
  return { statusCode, body: responseData }
}

/**
 * Get Grant Payment by SBI ID
 */
export async function getGrantPaymentById(sbiId) {
  const url = `${getBaseUrl()}${endpoint}/${sbiId}`

  console.log(`\n>>>>> OUTGOING REQUEST : grant-payments:GET by SbiId >>>>>`)
  console.log(`URL: ${url}`)

  const { statusCode, body } = await request(url, {
    method: 'GET',
    headers: getHeaders()
  })

  const responseData = await body.json()
  console.log('<<<<< INCOMING RESPONSE : grant-payments:GET by SbiId <<<<<')
  console.log(`STATUS: ${statusCode}`)
  console.log(`BODY:   ${JSON.stringify(responseData, null, 2)}\n`)

  return { statusCode, body: responseData }
}

/**
 * Get Grant Payment by SBI ID and Account Code
 */
export async function getGrantPaymentBySbiAccountId(sbiId, accountCode) {
  const url = `${getBaseUrl()}${endpoint}/${sbiId}/${accountCode}`

  console.log(
    `\n>>>>> OUTGOING REQUEST : grant-payments:GET by SbiId Account Code >>>>>`
  )
  console.log(`URL: ${url}`)

  const { statusCode, body } = await request(url, {
    method: 'GET',
    headers: getHeaders()
  })

  const responseData = await body.json()
  console.log(
    '<<<<< INCOMING RESPONSE : grant-payments:GET by SbiId Account Code <<<<<'
  )
  console.log(`STATUS: ${statusCode}`)
  console.log(`BODY:   ${JSON.stringify(responseData, null, 2)}\n`)

  return { statusCode, body: responseData }
}

/**
 * Get Daily Payments by Date
 * @param {string} date - Format YYYY-MM-DD
 */
export async function getDailyPayments(date) {
  const endpoint = `api/test/daily-payments/${date}`
  const url = `${getBaseUrl()}${endpoint}`

  console.log(`\n>>>>> OUTGOING REQUEST : daily-payments:GET >>>>>`)
  console.log(`URL: ${url}`)

  const { statusCode, body } = await request(url, {
    method: 'GET',
    headers: getHeaders()
  })

  const responseData = await body.json()

  console.log('<<<<< INCOMING RESPONSE : daily-payments:GET <<<<<')
  console.log(`STATUS: ${statusCode}`)
  if (responseData.docs) {
    console.log(`RECORDS FOUND: ${responseData.docs.length}\n`)
  }
  console.log(`BODY:   ${JSON.stringify(responseData, null, 2)}\n`)
  return { statusCode, body: responseData }
}

/**
 * Trigger Process Payments
 * @param {string} [date] - Optional format YYYY-MM-DD.
 * If omitted, the API defaults to tomorrow's date.
 */
export async function processPayments(date) {
  const path = date
    ? `api/test/process-payments/${date}`
    : `api/test/process-payments`
  const url = `${getBaseUrl()}${path}`

  console.log(`\n>>>>> OUTGOING REQUEST : process-payments:POST >>>>>`)
  console.log(`URL: ${url}`)

  const { statusCode, body } = await request(url, {
    method: 'POST',
    headers: getHeaders()
  })

  const responseData = await body.json()
  console.log('<<<<< INCOMING RESPONSE : process-payments:POST <<<<<')
  console.log(`STATUS: ${statusCode}`)
  console.log(`BODY:   ${JSON.stringify(responseData, null, 2)}\n`)

  return { statusCode, body: responseData }
}

/**
 * Trigger Cancellation via SQS
 * @param {object} data - { sbi, frn }
 */
export async function cancelPayment(data) {
  const url = `${getBaseUrl()}api/test/queue-message/gps__sqs__cancel_payment.fifo`

  console.log('\n>>>>> OUTGOING REQUEST : cancel-payment:POST (SQS) >>>>>')
  console.log(`URL: ${url}`)

  const { statusCode, body } = await request(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      type: 'cancel_payment',
      data: data
    })
  })

  const responseData = await body.json()
  console.log('<<<<< INCOMING RESPONSE : cancel-payment:POST <<<<<')
  console.log(`STATUS: ${statusCode}\n`)

  return { statusCode, body: responseData }
}

/**
 * Delete Grant Payments by SBI ID
 * @param {string} sbiId
 */
export async function deleteGrantPaymentsById(sbiId) {
  const url = `${getBaseUrl()}${endpoint}/${sbiId}`
  console.log('\n>>>>> OUTGOING REQUEST : grant-payments:DELETE by SbiId >>>>>')
  console.log(`URL: ${url}`)
  const { statusCode, body } = await request(url, {
    method: 'DELETE',
    headers: getHeaders()
  })
  const responseData = await body.json()
  console.log('<<<<< INCOMING RESPONSE : grant-payments:DELETE by SbiId <<<<<')
  console.log(`STATUS: ${statusCode}`)
  console.log(`BODY:   ${JSON.stringify(responseData, null, 2)}\n`)
  return { statusCode, body: responseData }
}

/**
 * Trigger Process Payments by SBI
 * @param {string} sbiId
 */
export async function processPaymentsBySbi(sbiId) {
  const url = `${getBaseUrl()}api/test/process-payments-by-sbi/${sbiId}`

  console.log('\n>>>>> OUTGOING REQUEST : process-payments-by-sbi:POST >>>>>')
  console.log(`URL: ${url}`)

  const { statusCode, body } = await request(url, {
    method: 'POST',
    headers: getHeaders()
  })

  const responseData = await body.json()

  console.log('<<<<< INCOMING RESPONSE : process-payments-by-sbi:POST <<<<<')
  console.log(`STATUS: ${statusCode}`)
  console.log(`BODY: ${JSON.stringify(responseData, null, 2)}\n`)

  return { statusCode, body: responseData }
}
