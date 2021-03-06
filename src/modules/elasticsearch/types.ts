import { Client } from '@elastic/elasticsearch'
import { ParcelFragment } from '../asset/types'

export interface IElasticsearchComponent {
    client: Client,
    bulkInsertParcels: (_landTokens: ParcelFragment[]) => Promise<void>,
    // bulkInsertEstates: (_estates: EstateFragment[]) => Promise<void>,
}

export type ParcelURIFormat = {
    name: string
    description: string
    image: string
    attributes: Attributes
    external_url: string
}

export type Attributes = {
    area: number
    width: number
    depth: number
    height: number
    elevation: number
    suburb: string
    island: string
    has_basement: string
    title: string
    "pre-built": boolean
    waterfront: string
    "closest-common": string
}