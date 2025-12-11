/**
 * Simple Pokémon API server using Express.
 *
 * Features:
 *  - Cache Pokémon data locally (cache.json)
 *  - GET /pokemon (with filters)
 *  - GET /pokemon/:idOrName
 *  - POST /refresh (fetch N Pokémon and update cache)
 */

const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();

const API_BASE = "https://pokeapi.co/api/v2";
const CACHE_FILE = "cache.json";
const FETCH_LIMIT = 150;
const TIMEOUT = 10000;

app.use(express.json());

let cache = { fetched_at: null, pokemon: {} };

function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    } 
    catch (err) {
        
      cache = { fetched_at: null, pokemon: {} };
    }
  }
}

function saveCache() {
  cache.fetched_at = new Date().toISOString();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

loadCache();

async function requestJson(url, params) {
  try {
    const result = await axios.get(url, { params, timeout: TIMEOUT });
    return result.data;
  } 
  catch (err) {
    if (err.code === "ECONNABORTED") {
      throw new Error("TIme out");
    }
    if (err.response) {
      throw new Error(`API error: ${err.response.status}`);
    }
    throw new Error("Network error");
  }
}

async function fetchPokemonDetails(name) {
  const data = await requestJson(`${API_BASE}/pokemon/${name}`);

  return {
    id: data.id,
    name: data.name,
    height: data.height,
    weight: data.weight,
    types: data.types?.map((t) => t.type.name) || [],
    abilities: data.abilities?.map((a) => a.ability.name) || [],
    sprites: data.sprites || {},
  };
}

async function refreshCache(limit) {
  const listData = await requestJson(`${API_BASE}/pokemon`, {
    limit,
    offset: 0,
  });

  const results = listData.results || [];

  for (const item of results) {
    try {
      const details = await fetchPokemonDetails(item.name);
      cache.pokemon[item.name.toLowerCase()] = details;
    } catch (err) {
      console.log(`Failed to fetch ${item.name}: ${err.message}`);
    }
  }

  saveCache();
}


app.post("/refresh", async (req, res) => {
  const limit = parseInt(req.query.limit) || FETCH_LIMIT;

  try {
    await refreshCache(limit);
    return res.json({
      success: true,
      cached: Object.keys(cache.pokemon).length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


app.get("/pokemon", (req, res) => {
  let list = Object.values(cache.pokemon);
  const q = req.query;

  if (q.name_contains) {
    const search = q.name_contains.toLowerCase();
    list = list.filter((p) => p.name.includes(search));
  }

  if (q.type) {
    const types = q.type.split(",").map((t) => t.trim().toLowerCase());
    list = list.filter((p) =>
      p.types.some((t) => types.includes(t.toLowerCase()))
    );
  }

  if (q.min_weight) {
    list = list.filter((p) => p.weight >= parseInt(q.min_weight));
  }

  if (q.max_weight) {
    list = list.filter((p) => p.weight <= parseInt(q.max_weight));
  }

  const limit = parseInt(q.limit) || 50;
  list = list.sort((a, b) => a.id - b.id).slice(0, limit);

  return res.json({ count: list.length, results: list });
});

app.get("/pokemon/:idOrName", async (req, res) => {
  const key = req.params.idOrName.toLowerCase();

  if (cache.pokemon[key]) {
    return res.json(cache.pokemon[key]);
  }

  const found = Object.values(cache.pokemon).find(
    (p) => String(p.id) === key
  );
  if (found) return res.json(found);

  try {
    const details = await fetchPokemonDetails(key);
    cache.pokemon[details.name.toLowerCase()] = details;
    saveCache();
    return res.json(details);
  } catch (err) {
    return res.status(404).json({ error: "Pokémon not found" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API is running at http://localhost:${PORT}`);
  console.log(`Loaded ${Object.keys(cache.pokemon).length} Pokémon from cache.`);
});
