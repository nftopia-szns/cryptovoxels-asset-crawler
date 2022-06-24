# Elasticsearch query guide
```
GET /estate/_search?q=name:2x1+Free NFT Ga

GET /parcel/_search?q=Ideal place

POST /_analyze
{
  "tokenizer": ["whitespace", "standard"],
  "filter": ["lowercase"],
  "text": "九九至尊"
}

```
## Query DSL
```

```