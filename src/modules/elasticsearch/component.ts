import { IBaseComponent, IConfigComponent } from "@well-known-components/interfaces";
import { IElasticsearchComponent, SandboxPropertyElasticsearch } from "./types";
import { Client } from '@elastic/elasticsearch'
import { ParcelFragment } from "../asset/types";
import fetch from 'node-fetch'

export async function createElasticsearchComponent(components: {
    config: IConfigComponent,
}): Promise<IElasticsearchComponent & IBaseComponent> {
    const { config } = components

    let client: Client;
    // try to use cloud first
    try {
        // get config
        const cloudId = await config.requireString("ES_CLOUD_ID")
        const apiKey = await config.requireString("ES_API_KEY")
        client = new Client({
            cloud: { id: cloudId },
            auth: { apiKey: apiKey },
        })
        console.log('Elastic search connected to cloud')
    } catch (ex) {
        console.error('Elasticsearch connection error: failed to connect cloud service');
    }

    // try to use self hosted node
    try {
        // get config
        const esNodeHost = await config.requireString("ES_NODE_HOST")
        const esNodePort = await config.requireString("ES_NODE_PORT")
        const esNodeUrl = `http://${esNodeHost}:${esNodePort}`
        client = new Client({
            node: esNodeUrl
        })
        console.log('Elastic search connected to self hosted node')
    } catch (ex) {
        console.error('Elasticsearch connection error: failed to connect to self hosted node');
    }

    if (!client) {
        throw new Error("Elasticsearch connection error: neither elastic cloud or docker are not connected.")
    }

    // get config of blockchain network, chain id and contract addresses
    const bcNetwork = await config.requireString('BLOCKCHAIN_NETWORK')
    const bcChainId = await config.requireNumber('BLOCKCHAIN_CHAIN_ID')

    // check and init mappings
    const PROPERTY_INDEX_NAME = `sandbox-${bcNetwork}-${bcChainId}`
    const isPropertyIndexExisted = await client.indices.exists({ index: PROPERTY_INDEX_NAME })
    if (!isPropertyIndexExisted) {
        console.log('property index unexisted, create new');
        const createResp = await client.indices.create({
            index: PROPERTY_INDEX_NAME,
            mappings: {
                properties: {
                    "id": {
                        "type": "keyword",
                    },
                    "owner": {
                        "type": "keyword",
                    },
                    "network": {
                        "type": "keyword",
                        "index": false,
                    },
                    "chain_id": {
                        "type": "integer",
                        "index": false,
                    },
                    "contract_address": {
                        "type": "text",
                        "index": false
                    },
                    "category": {
                        "type": "keyword"
                    },
                    "land_type": {
                        "type": "keyword"
                    },
                    "name": {
                        "type": "text",
                        "analyzer": "standard"
                    },
                    "description": {
                        "type": "text",
                        "analyzer": "standard"
                    },
                    "image": {
                        "type": "text",
                        "index": false,
                    },
                    "external_url": {
                        "type": "text",
                        "index": false,
                    },
                    "attributes.x": {
                        "type": "integer",
                    },
                    "attributes.y": {
                        "type": "integer",
                    },
                    "attributes.coordinate": {
                        "type": "keyword",
                    },
                    "sandbox.name": {
                        "type": "text",
                        "index": false,
                    },
                    "sandbox.description": {
                        "type": "text",
                        "index": false,
                    },
                    "sandbox.image": {
                        "type": "text",
                        "index": false,
                    }
                }
            }
        })

        console.log(`${createResp.index} creation response: ${createResp.acknowledged}`)
    }

    const bulkInsertParcels = async (_landTokens: ParcelFragment[]) => {
        if (_landTokens.length === 0) return

        let dataset: SandboxPropertyElasticsearch[] = []
        for (const _landToken of _landTokens) {
            let landToken = new SandboxPropertyElasticsearch()
            landToken.id = _landToken.id
            landToken.owner = _landToken.owner.id
            landToken.network = bcNetwork
            landToken.chain_id = bcChainId
            landToken.contract_address = 'emptyyyy'
            // // TODO: adjust this we get estate of the sand box
            // landToken.category = LandCategory.Land
            // landToken.attributes = {
            //     x: _landToken.x,
            //     y: _landToken.y,
            //     coordinate: `${_landToken.x},${_landToken.y}`
            // }

            // if (_landToken.tokenURIContent && _landToken.tokenURIContent !== '{}') {
            //     const tokenURIContent: ParcelURIFormat = JSON.parse(_landToken.tokenURIContent)
            //     const attributes = parseAttributes(tokenURIContent.properties)
            //     landToken.land_type = attributes["land_type"]
            //     landToken.image = tokenURIContent.image // should not use image in sandbox
            //     landToken.external_url = tokenURIContent.external_url
            //     landToken.sandbox = tokenURIContent.sandbox
            //     if (tokenURIContent.sandbox.name) {
            //         landToken.name = tokenURIContent.sandbox.name
            //     }
            //     if (tokenURIContent.sandbox.description) {
            //         landToken.name = tokenURIContent.sandbox.description
            //     }
            // }

            dataset.push(landToken)
        }

        const operations = dataset.flatMap(doc => [{ index: { _index: PROPERTY_INDEX_NAME, _id: doc.id } }, doc])
        const bulkResponse = await client.bulk({ refresh: true, operations })

        if (bulkResponse.errors) {
            console.log(bulkResponse.items[0].index.error)
            console.error(bulkResponse.errors);
        }
    }

    return {
        client,
        bulkInsertParcels,
    }
}

// function parseAttributes(_attributes: LandTokenURIProperty[]): object {
//     let attributesElasticsearch = {}

//     for (const attr of _attributes) {
//         switch (attr.trait_type) {
//             case "Land X":
//                 attributesElasticsearch["x"] = attr.value
//                 break;
//             case "Land Y":
//                 attributesElasticsearch["y"] = attr.value
//                 break;
//             case "Land Type":
//                 attributesElasticsearch["land_type"] = (attr.value as string).toLowerCase()
//                 break;
//             default:
//         }
//     }

//     return attributesElasticsearch
// }