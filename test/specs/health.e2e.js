import { expect } from '@wdio/globals'
import { request } from 'undici'

describe('Grants Payment Service - Health API', () => {
  it('Should return success from Health endpoint', async () => {
    const url = browser.options.baseUrl + 'health'
    console.log('URL:', url)
    const headers = {
      Accept: 'application/json',
      'Accept-Encoding': '*'
    }
    if (process.env.USER_TOKEN) {
      headers['x-api-key'] = process.env.USER_TOKEN
    }

    console.log('\n===== REQUEST =====')
    console.log('Headers:', headers)

    const {
      statusCode,
      headers: responseHeaders,
      body
    } = await request(url, {
      method: 'GET',
      headers
    })

    const responseText = await body.text()

    console.log('\n===== RESPONSE =====')
    console.log('Status Code:', statusCode)
    console.log('Response Headers:', responseHeaders)
    console.log('Body:', responseText)
    console.log('====================\n')

    expect(statusCode).toBe(200)

    const json = JSON.parse(responseText)
    expect(json.message).toBe('success')
  })
})
