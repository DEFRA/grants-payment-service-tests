import { request } from 'undici'

const endpoint = 'api/test/grant-payments'
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
 * Create Grant Payment
 */
export async function createGrantPayment(payload) {
  const url = `${getBaseUrl()}${endpoint}`

  console.log('\n>>>>> OUTGOING REQUEST : grant-payments:POST >>>>>')
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

  return { statusCode, body: responseData }
}

/**
 * Trigger Process Payments for a specific date
 * @param {string} date - Format YYYY-MM-DD
 */
export async function processPayments(date) {
  const url = `${getBaseUrl()}api/test/process-payments/${date}`

  console.log(`\n>>>>> OUTGOING REQUEST : process-payments:POST >>>>>`)
  console.log(`URL: ${url}`)

  const { statusCode, body } = await request(url, {
    method: 'POST',
    headers: getHeaders()
  })

  const responseData = await body.json()
  console.log('<<<<< INCOMING RESPONSE : process-payments:POST <<<<<')
  console.log(`STATUS: ${statusCode}`)

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
