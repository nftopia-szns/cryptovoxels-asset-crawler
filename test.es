
GET _cat/indices

GET /cryptovoxels-ethereum-mainnet/_search
{
    "query": {
        "match_all": {}
    }
}

DELETE /sandbox-ethereum-1