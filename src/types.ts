import { AssetConfig } from './modules/asset/types'
import {
  IConfigComponent,
  IHttpServerComponent,
  ILoggerComponent,
  IMetricsComponent,
} from '@well-known-components/interfaces'
import { metricDeclarations } from './metrics'
import { IDatabaseComponent } from './modules/database/types'
import { IAssetComponent } from './modules/asset/types'

export type GlobalContext = {
  components: BaseComponents
}

export type AppConfig = AssetConfig

export type BaseComponents = {
  config: IConfigComponent
  database: IDatabaseComponent
  asset: IAssetComponent
  server: IHttpServerComponent<GlobalContext>
  logs: ILoggerComponent
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
}

// production components
export type AppComponents = BaseComponents & {
  statusChecks: {}
}

// test environment components
export type TestComponents = BaseComponents & {}
