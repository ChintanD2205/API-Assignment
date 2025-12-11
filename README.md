# API-Assignment

Fetch Pokemon data from the PokeAPI and exposes simple API endpoint

What this does ?
- Fetch Pokemon data from PokeAPI
- Save it locally to cache.json
- List Pokemon with filters
- Refresh entire cache manually
- Get single Pokemon details

Steps to run: 
- Install dependencies:  npm install
- Start Server:          node index.js
- Server runs at:        http://localhost:3000

- Refresh Data: (PS)->   Invoke-WebRequest -Uri "http://localhost:3000/refresh" -Method POST
This downloads the first 150 Pokemon

Endpoints
1. List Pokemon:GET /pokemon
Usable Filters:
- /pokemon?name_contains=char
- /pokemon?type=fire
- /pokemon?min_weight=100
- /pokemon?max_weight=300
- /pokemon?limit=20

2. Get Pokemon by Name or ID:
- GET /pokemon/pikachu
- GET /pokemon/25

3. Refresh Cache: POST /refresh
