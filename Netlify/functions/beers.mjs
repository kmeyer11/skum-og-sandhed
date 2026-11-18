// Netlify kan ikke køre .NET-appen, så denne funktion gør det samme som /api/beers i Client:
// læser arket ved hvert kald og mapper kolonnerne som Persistence/GoogleSheets/BeerLoaderService.cs.
// Ændres mappingen dér, skal den også ændres her.
import { createSign } from "node:crypto";

export const config = { path: "/api/beers.json" };

const DEFAULT_SPREADSHEET_ID = "141LDJNA1KpJpEULTmpme4MhyJkoZ9fRHmbnqYH4EKfs";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

export default async () => {
  try {
    const beers = await loadBeers();
    return Response.json(beers, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return Response.json({ title: "Kunne ikke hente øl fra Google Sheets", detail: err.message }, { status: 500 });
  }
};

async function loadBeers() {
  const token = await getAccessToken();
  const [beerRows, ratingRows] = await Promise.all([
    getRange(token, "Beers_Input!A2:Q"),
    getRange(token, "Rating_Input!A1:Z"),
  ]);

  const beers = mapBeers(beerRows);
  for (const [id, ratings] of mapMemberRatings(ratingRows)) {
    const beer = beers.get(id);
    if (beer) beer.memberRatings = ratings;
  }
  return [...beers.values()];
}

function mapBeers(rows) {
  const beers = new Map();
  for (const row of rows) {
    if (row.length < 2) continue;
    const id = parseInt32(row[0]);
    if (id === null) continue;

    beers.set(id, {
      beerId: id,
      name: getString(row, 1),
      breweries: splitList(row, 2),
      releaseYear: getInt(row, 3),
      drinkingYear: getInt(row, 4),
      abv: getDecimal(row, 5),
      foodPairing: getString(row, 6) ?? "Ingen",
      description: getString(row, 7) ?? "Ingen Beskrivelse",
      fermentation: getString(row, 8),
      yeastType: getString(row, 9),
      price: getDecimal(row, 10),
      rating: getDecimal(row, 11),
      untappdRating: getDecimal(row, 12),
      hops: splitList(row, 13),
      malts: splitList(row, 14),
      adjuncts: splitList(row, 15),
      types: splitList(row, 16),
      memberRatings: {},
    });
  }
  return beers;
}

// Rating_Input har én kolonne pr. medlem efter beer_id; Mean og spread er formler, som stopper medlemslisten.
// Kun tomme celler er "ikke bedømt": arkets snit regner et 0 med, så det gør vi også.
function mapMemberRatings(rows) {
  const result = new Map();
  if (rows.length === 0) return result;

  const members = [];
  for (const cell of rows[0].slice(1)) {
    const name = String(cell ?? "").trim();
    if (name === "" || name.toLowerCase() === "mean") break;
    members.push(name);
  }

  for (const row of rows.slice(1)) {
    const id = parseInt32(row[0]);
    if (row.length < 2 || id === null) continue;

    const ratings = {};
    members.forEach((member, i) => {
      if ((getString(row, i + 1) ?? "").trim() === "") return;
      ratings[member] = getDecimal(row, i + 1);
    });

    if (Object.keys(ratings).length > 0 && !result.has(id)) result.set(id, ratings);
  }
  return result;
}

function getString(row, i) {
  return i < row.length && row[i] != null ? String(row[i]) : null;
}

function parseInt32(value) {
  const s = String(value ?? "").trim();
  return /^[+-]?\d+$/.test(s) ? Number(s) : null;
}

function getInt(row, i) {
  return parseInt32(row[i]) ?? 0;
}

// Arket bruger dansk decimalkomma ("10,5").
function getDecimal(row, i) {
  const s = (getString(row, i) ?? "").trim().replaceAll(",", ".");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return 0;
  return Number(s);
}

function splitList(row, i) {
  const s = getString(row, i);
  if (!s || s.trim() === "") return [];
  return s.split(",").filter((x) => x !== "").map((x) => x.trim());
}

async function getRange(token, range) {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets ${range}: ${res.status} ${await res.text()}`);
  return (await res.json()).values ?? [];
}

// Service account-flowet uden googleapis-pakken, så funktionen ikke har afhængigheder.
async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  if (!email || !key) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL eller GOOGLE_PRIVATE_KEY mangler.");

  const now = Math.floor(Date.now() / 1000);
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: email,
    scope: SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key, "base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`Google token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

// Netlifys felt er én linje, så nøglens linjeskift ender som "\n", mellemrum eller ingenting.
// Node kan kun læse PEM med rigtige linjeskift, så vi bygger den op igen.
function normalizePrivateKey(raw) {
  if (!raw) return null;
  let s = raw.trim();
  if (s.startsWith("{")) s = JSON.parse(s).private_key ?? "";
  s = s.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");

  const pem = s.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!pem) return s;
  const body = pem[2].replace(/\s+/g, "").match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${pem[1]}-----\n${body}\n-----END ${pem[1]}-----\n`;
}
