import { AssetConfig } from './modules/asset/types'
import {
  IConfigComponent,
  ILoggerComponent,
} from '@well-known-components/interfaces'
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
  logs: ILoggerComponent
}

// production components
export type AppComponents = BaseComponents & {
}

// test environment components
export type TestComponents = BaseComponents & {}
