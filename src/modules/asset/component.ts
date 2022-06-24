import { IBaseComponent, IConfigComponent, IStatusCheckCapableComponent } from '@well-known-components/interfaces'
import {
  IAssetComponent,
  ParcelFragment,
  LandTokenResult as ParcelResult,
} from './types'
import {
  graphql, sleep, _fetchTokenURIContent,
} from './utils'
import { IDatabaseComponent } from '../database/types'
import { LastSync } from '../../entity/LastSync'
import { IElasticsearchComponent, ParcelURIFormat } from '../elasticsearch/types'

const parcelFields = `{
  id
  owner {
    id
  }
}`

export async function createAssetComponent(components: {
  config: IConfigComponent,
  database: IDatabaseComponent,
  elasticsearch: IElasticsearchComponent,
}): Promise<IAssetComponent & IBaseComponent & IStatusCheckCapableComponent> {
  const { config, database, elasticsearch } = components

  // config
  const url = await config.requireString('API_URL')
  const batchSize = await config.requireNumber('API_BATCH_SIZE')
  const concurrency = await config.requireNumber('API_CONCURRENCY')
  const refreshInterval = await config.requireNumber('REFRESH_INTERVAL') * 1000

  // data
  let ready = false
  let landTokenLastUpdatedAt = 0

  // events
  const lifeCycle: IBaseComponent = {
    async start() {
      const r1 = await parcelStart()
      if (r1.isReady) {
        // TODO: add sleep 60s
        // poll()
        fetchTokenURIContent()
      } else {
        console.error('Poll halt! Initial sync faced issues.');
      }
    }
  }

  const statusChecks: IStatusCheckCapableComponent = {
    async startupProbe() {
      return isReady()
    },
    async readynessProbe() {
      return isReady()
    },
  }

  // methods
  async function parcelStart(): Promise<{ result: ParcelResult, isReady: boolean }> {
    const lastSyncRepo = await database.appDataSource.getRepository(LastSync);
    let parcelLastSync = await lastSyncRepo.findOne({
      where: {
        table: "parcel"
      }
    });

    let result: ParcelResult = undefined

    if (parcelLastSync !== null && parcelLastSync.lastSyncedAt > 0) {
      landTokenLastUpdatedAt = parcelLastSync.lastSyncedAt
    } else {
      console.log('[Parcel] Sync from beginning...')
      try {
        result = await fetchAllParcels()
        console.log('Received total', result.landTokens.length, 'land tokens');
        const lastTokenId = result.landTokens.pop().id
        console.log('Land token last updated at', lastTokenId)
        landTokenLastUpdatedAt = Number(lastTokenId)

        await database.updateLastUpdatedAt("land_token", landTokenLastUpdatedAt)
      } catch (e) {
        console.error(e)
        return { result: result, isReady: false }
      }
    }

    return { result: result, isReady: true }
  }

  async function poll() {
    try {
      console.log("Polling land token changes after", landTokenLastUpdatedAt)
      const result = await fetchUpdatedLandTokens(landTokenLastUpdatedAt)
      console.log("Received ", result.landTokens.length, " land token(s) to be updated")
      if (result.landTokens && result.landTokens.length > 0) {
        // update in db
        database.updateLastUpdatedAt("land_token", landTokenLastUpdatedAt)
        database.insertOrUpdateBatchParcels(result.landTokens)
        elasticsearch.bulkInsertParcels(result.landTokens)
      }
    } catch (e) {
      console.error(e)
    }

    await sleep(refreshInterval)
    poll()
  }

  async function fetchTokenURIContent() {
    console.log('Started new token URI fetch round');
    const landTokens = await database.fetchLandTokensWithNoTokenURIContent()

    if (landTokens.length > 0) {
      for (const landToken of landTokens) {
        try {
          const content = await _fetchTokenURIContent<ParcelURIFormat>(landToken.id.toString())
          console.log('Fetched ', landToken.id);
          await database.updateTokenURIContent(landToken.id, JSON.stringify(content))
          
          // in case if this is valid content -> update in elasticsearch
          if (Object.keys(content).length > 0) {
            // update in elasticsearch
            const landTokenFragment = {
              id: landToken.id.toString(),
              owner: {
                id: landToken.owner
              },
              tokenURIContent: content,
            }
            await elasticsearch.bulkInsertParcels([landTokenFragment])
          }
        } catch (error) {
          console.error(`Token ${landToken.id} URI content fetch failed: ${error}`)
        }
      }

      fetchTokenURIContent()
    }
  }

  async function fetchAllParcels() {
    let parcels: ParcelFragment[] = []

    // auxiliars
    let batches: Promise<ParcelFragment[]>[] = []
    let complete = false
    let lastTokenId = ''

    while (!complete) {
      // fetch batch
      const batch = fetchBatchParcels(lastTokenId, batches.length).then((batch) => {
        console.log("Fetched batch with", batch.length, " parcels");

        // insert batch to database, without waiting for it
        database.unsafeInsertBatchParcels(batch)

        // insert batch to elastic
        // elasticsearch.bulkInsertParcels(batch)

        // update memory storage parcels
        parcels = parcels.concat(batch)
        return batch
      })

      // when max concurrency is reached...
      batches.push(batch)
      if (batches.length === Math.max(concurrency, 1)) {
        // ...wait for all the batches to finish
        const results = await Promise.all(batches)

        const nonEmptyResults = results.filter((result) => result.length > 0)
        // if results are non-empty
        if (nonEmptyResults.length > 0) {
          // find last token id
          lastTokenId = nonEmptyResults
            .pop()! // take last result
            .pop()!.id! // take the last element and its token id
        }

        // prepare next iteration
        complete = results
          .some((result) => result.length === 0)
        batches = []
      }
    }

    const result: ParcelResult = {
      landTokens: parcels,
    }

    return result
  }

  async function fetchBatchParcels(lastTokenId = '', page = 0) {
    const { parcels } = await graphql<{ parcels: ParcelFragment[] }>(
      url,
      `{
        parcels(
          first: ${batchSize},
          skip: ${batchSize * page},
          orderBy: id,
          orderDirection: asc,
          where: {
            ${lastTokenId ? `id_gt: "${lastTokenId}",` : ''}
          }
        ) ${parcelFields}
      }`
    )

    return parcels
  }

  async function fetchUpdatedLandTokens(updatedAfter: number) {
    try {
      const { landTokens } = await graphql<{
        landTokens: ParcelFragment[]
      }>(
        url,
        `{
        landTokens(
          first: ${batchSize},
          orderBy: timestamp,
          orderDirection: asc,
          where: {
            timestamp_gt: "${updatedAfter}",
          }
        ) ${parcelFields}
      }`
      )

      if (!landTokens.length) {
        return {
          landTokens,
          updatedAt: updatedAfter
        }
      }

      const result: ParcelResult = {
        landTokens,
      }

      return result
    } catch (e) {
      throw new Error(`Failed to fetch update data: ${e.message}`)
    }
  }

  function isReady() {
    return ready
  }

  return {
    ...lifeCycle,
    ...statusChecks,
    isReady,
  }
}
