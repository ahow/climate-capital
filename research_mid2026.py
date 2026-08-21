import json
import pplx_sdk

queries = [
    "Tesla stock August 2026 China competition",
    "Enphase stock August 2026 residential solar tariffs",
    "Orsted 2025 rights issue offshore wind",
    "Plug Power 2025 dilution going concern",
    "NextEra 2025 AI data center power demand",
    "Exxon stock 2025 share buyback oil",
    "Peabody Energy 2025 coal demand stock",
    "Volkswagen 2025 China EV sales crisis",
    "ICLN 2025 clean energy ETF recovery",
    "S&P 500 ESG index 2025 AI returns",
    "S&P 500 2025 AI rally return",
    "green bond market 2025 rates performance",
    "Enel sustainability linked bond 2025 performance",
    "UK offshore wind 2025 project write-downs",
    "US solar 2025 tariffs impact",
    "Brookfield Renewable 2025 AI power purchase agreements",
    "EU ETS price 2025 70 80 euros",
    "voluntary carbon market 2025 integrity demand",
    "natural capital fund 2025 investment performance",
    "Beyond Meat 2025 going concern financial results",
    "PG&E 2025 wildfire season financial results",
    "Climeworks Mammoth 2025 underperforming costs",
    "IRA rollback 2025 2026 tax credits climate policy",
    "hyperscaler nuclear deals 2025 power demand",
]
results = pplx_sdk.search.web_many(queries, limit_per_query=4, concurrency=5)
rows=[]
for query, entry in zip(queries, results):
    row={"query":query,"ok":entry.ok,"hits":[]}
    if entry.ok:
        for hit in entry.result:
            row["hits"].append({"title":hit.title,"url":hit.url,"snippet":hit.snippet,"date":getattr(hit,"date",None)})
    else:
        row["error"]=str(entry.error)
    rows.append(row)
with open('/home/user/workspace/climate-capital/research_mid2026_sources.json','w') as f:
    json.dump(rows,f,indent=2)
print(json.dumps(rows,indent=2))
