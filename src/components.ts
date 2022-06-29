import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createLogComponent } from '@well-known-components/logger'
import { AppComponents } from './types'
import { createDatabaseComponent } from './modules/database/component'
import { createElasticsearchComponent } from './modules/elasticsearch/component'
import { createAssetComponent } from './modules/asset/component'

export async function initComponents(): Promise<AppComponents> {
  const config = await createDotEnvConfigComponent(
    { path: ['.env'] },
    process.env
  )

  console.log('------------------ ENVIRONMENT -------------------');
  console.log('API_URL', process.env.API_URL)
  console.log('API_BATCH_SIZE', process.env.API_BATCH_SIZE)
  console.log('API_CONCURRENCY', process.env.API_CONCURRENCY)
  console.log('REFRESH_INTERVAL', process.env.REFRESH_INTERVAL)
  console.log('BLOCKCHAIN_NETWORK', process.env.BLOCKCHAIN_NETWORK)
  console.log('BLOCKCHAIN_CHAIN_ID', process.env.BLOCKCHAIN_CHAIN_ID)
  console.log('POSTGRES_HOST', process.env.POSTGRES_HOST)
  console.log('POSTGRES_PORT', process.env.POSTGRES_PORT)
  console.log('POSTGRES_USER', process.env.POSTGRES_USER)
  console.log('POSTGRES_DB_NAME', process.env.POSTGRES_DB_NAME)
  console.log('ES_NODE_HOST', process.env.ES_NODE_HOST)
  console.log('ES_NODE_PORT', process.env.ES_NODE_PORT)
  console.log('ES_KIBANA_PORT', process.env.ES_KIBANA_PORT)
  console.log('------------------ ENVIRONMENT -------------------');

  const logs = createLogComponent()
  const database = await createDatabaseComponent({ config })
  const elasticsearch = await createElasticsearchComponent({ config })
  const asset = await createAssetComponent({ config, database, elasticsearch })

  return {
    config,
    database,
    asset,
    logs,
  }
}
