import fetch from "node-fetch"

// helper to do GraphQL queries with retry logic
export async function graphql<T>(url: string, query: string, retries = 5, retryDelay = 500): Promise<T> {
  try {
    const res = await fetch(url, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
      }),
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch TheGraph: ${await res.text()}`)
    }

    const result = await res.json() as { data: T }

    if (!result || !result.data || Object.keys(result.data).length === 0) {
      throw new Error(`Invalid response. Result: ${JSON.stringify(result)}`)
    }

    return result.data
  } catch (error) {
    // retry
    console.log(`Retrying graphql fetch. Error: ${error.message}.`)

    if (retries > 0) {
      // retry
      await sleep(retryDelay)
      return graphql<T>(url, query, retries - 1, retryDelay * 2)
    } else {
      throw error // bubble up
    }
  }
}

export function capitalize(text: string) {
  return text[0].toUpperCase() + text.slice(1)
}

export async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export async function _fetchTokenURIContent<T>(tokenId: string): Promise<T> {
  const tokenURI = "https://www.cryptovoxels.com/p/" + tokenId;
  const res = await fetch(tokenURI, {
    method: 'get',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch token URI: ${await res.text()}`)
  }

  const result = await res.json() as T
  if (!result || Object.keys(result).length === 0) {
    throw new Error(`Invalid response. Result: ${JSON.stringify(result)}`)
  }

  return result
}