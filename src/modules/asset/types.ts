import { BigNumberish } from "@ethersproject/bignumber"
import { ParcelURIFormat } from "../elasticsearch/types"

export type AssetConfig = {
  API_URL: string
  API_BATCH_SIZE: number
  API_CONCURRENCY: number
}

export interface IAssetComponent {
  isReady: () => boolean
}

export type ParcelFragment = {
  id: string
  owner: { id: string }
  tokenURIContent?: ParcelURIFormat
}

export type ParcelBatch = { landTokens: ParcelFragment[] }
export type LandTokenResult = ParcelBatch