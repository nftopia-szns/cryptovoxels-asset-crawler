import { IBaseComponent, IConfigComponent } from "@well-known-components/interfaces";
import { DataSource, IsNull } from "typeorm";
import { LastSync } from "../../entity/LastSync";
import { Parcel } from "../../entity/Parcel";
import { ParcelFragment } from "../asset/types";
import { IDatabaseComponent } from "./types";

export async function createDatabaseComponent(components: {
    config: IConfigComponent,
}): Promise<IDatabaseComponent & IBaseComponent> {
    const { config } = components

    const pgHost = await config.requireString('POSTGRES_HOST')
    const pgPort = await config.requireNumber('POSTGRES_PORT')
    const pgUser = await config.requireString('POSTGRES_USER')
    const pgPwd = await config.requireString('POSTGRES_PWD')
    const pgDbName = await config.requireString('POSTGRES_DB_NAME')
    const pgDbSchema = await config.requireString('POSTGRES_DB_SCHEMA')

    const dataSource = new DataSource({
        type: "postgres",
        host: pgHost,
        port: pgPort,
        username: pgUser,
        password: pgPwd,
        database: pgDbName,
        schema: pgDbSchema,
        synchronize: true,
        logging: false,
        entities: [
            LastSync,
            Parcel,
        ],
        migrations: [],
        subscribers: [],
    })

    if (!dataSource.isInitialized) {
        console.log("initializing database...");
        await dataSource.initialize()
    }

    const updateLastUpdatedAt = async (_table: string, updatedAt: number) => {
        const lastSyncRepo = await dataSource.getRepository(LastSync);
        let lastSync = await lastSyncRepo.findOne({
            where: {
                table: _table
            }
        });

        if (lastSync === null) {
            // create a new one
            lastSync = new LastSync()
            lastSync.table = _table
            lastSync.lastSyncedAt = updatedAt
            await lastSyncRepo.save(lastSync)
        } else {
            lastSync.lastSyncedAt = updatedAt
        }

        await lastSyncRepo.save(lastSync)
    }

    /**
     * This function tries to import parcel fastly
     * The active order and estate field are left as null intentionally
     * @param _parcels 
     */
    const unsafeInsertBatchParcels = async (_parcels: ParcelFragment[]) => {
        if (_parcels.length === 0) return

        await dataSource
            .createQueryBuilder()
            .insert()
            .into(Parcel)
            .values(_parcels.map<Parcel>((_parcel) => {
                let parcel = new Parcel()
                parcel.id = Number(_parcel.id)
                parcel.owner = _parcel.owner.id

                return parcel
            }))
            .orIgnore()
            .execute()
    }

    const insertOrUpdateBatchParcels = async (_parcels: ParcelFragment[]) => {
        const parcelRepo = await dataSource.getRepository(Parcel)

        for (const _parcel of _parcels) {
            let parcel = await parcelRepo.findOneBy({ id: Number(_parcel.id) })
            if (parcel === null) {
                // create new
                parcel = new Parcel()
                parcel.id = Number(_parcel.id)
            }
            // update
            parcel.owner = _parcel.owner.id

            await parcelRepo.save(parcel)
        }
    }

    const fetchLandTokensWithNoTokenURIContent = async (): Promise<Parcel[]> => {
        const landTokenRepo = await dataSource.getRepository(Parcel)

        return await landTokenRepo.find({
            take: 100, // not big not small, just enough ;-)
            order: { id: "asc" },
            where: { tokenURIContent: IsNull() }
        })
    }

    const updateTokenURIContent = async (_landTokenId: number, _landTokenURIContent: string) => {
        const landTokenRepo = await dataSource.getRepository(Parcel)
        let landToken = await landTokenRepo.findOneBy({ id: _landTokenId })
        if (landToken !== null) {
            landToken.tokenURIContent = JSON.parse(_landTokenURIContent)
            await landTokenRepo.save(landToken)
        }
    }

    return {
        appDataSource: dataSource,
        updateLastUpdatedAt,
        unsafeInsertBatchParcels,
        insertOrUpdateBatchParcels,
        fetchLandTokensWithNoTokenURIContent,
        updateTokenURIContent,
    }
}

function parseDate(epoch: string, isMilis: boolean = false): Date {
    return new Date(
        isMilis ? Number(epoch) : Number(epoch) * 1000
    )
}