// google-places-importer.js
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parse } from "json2csv";

const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
const resultsDir = "./Results";
const jsonPath = path.join(resultsDir, "pet-stores.json");
const csvPath = path.join(resultsDir, "pet-stores.csv");
if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

const existing = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath)) : [];
const known = new Set(existing.map(e => e.place_id));
const scraped = [...existing];

// ---- call NearbySearch for one tile ----
async function searchPlaces(lat, lng, radius = 50000) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=pet_store&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results;
}

// ---- get full details for one place ----
async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,geometry,business_status,url&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result;
}

// ---- main collector for one coordinate ----
async function collectTile(lat, lng) {
  const places = await searchPlaces(lat, lng);
  for (const p of places) {
    if (known.has(p.place_id)) continue;
    const d = await getPlaceDetails(p.place_id);
    const row = {
      Name: d.name,
      Type: "pet_store",
      Link: d.url,
      Address: d.formatted_address,
      City: d.formatted_address.split(",").slice(-3, -2)[0]?.trim() || "",
      State: d.formatted_address.split(",").slice(-2, -1)[0]?.trim() || "",
      Phone: d.formatted_phone_number || "",
      Website: d.website || "",
      Hours: d.opening_hours?.weekday_text?.join("; ") || "",
      OPEN: d.business_status === "OPERATIONAL" ? "TRUE" : "FALSE",
      Catagory: "pet",
      place_id: d.place_id,
      lat: d.geometry.location.lat,
      lng: d.geometry.location.lng,
    };
    scraped.push(row);
    known.add(p.place_id);
    console.log(`✅ ${row.Name}`);
    fs.writeFileSync(jsonPath, JSON.stringify(scraped, null, 2));
    fs.writeFileSync(csvPath, parse(scraped));
    await new Promise(r => setTimeout(r, 250)); // gentle pacing
  }
}

// ---- example driver: small sample grid ----
(async () => {
  const tiles = [
    { lat: 40.7128, lng: -74.0060 }, // NYC
    { lat: 34.0522, lng: -118.2437 }, // LA
  ];
  for (const t of tiles) {
    console.log(`📍 Searching around ${t.lat},${t.lng}`);
    await collectTile(t.lat, t.lng);
  }
  console.log("✅ Finished collection.");
})();