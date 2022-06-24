import { DataSource } from "typeorm";
import { Parcel } from "../../entity/Parcel";
import { ParcelFragment } from "../asset/types";

export interface IDatabaseComponent {
    appDataSource: DataSource
    updateLastUpdatedAt: (_table: string, updatedAt: number) => Promise<void>
    unsafeInsertBatchParcels: (_parcels: ParcelFragment[]) => Promise<void>
    insertOrUpdateBatchParcels: (_parcels: ParcelFragment[]) => Promise<void>
    fetchLandTokensWithNoTokenURIContent: () => Promise<Parcel[] >
    updateTokenURIContent: (_landTokenId: number, _landTokenURIContent: string) => Promise<void>
}