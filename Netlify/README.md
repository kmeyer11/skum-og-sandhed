# Netlify-udgaven

Statisk kopi af Client-siderne (`site/`) plus en Netlify Function (`functions/beers.mjs`), der læser Google Sheets ved hvert kald til `/api/beers.json`. Mappingen er en kopi af `Persistence/GoogleSheets/BeerLoaderService.cs`, så ret begge steder.

## Miljøvariabler (Netlify → Site configuration → Environment variables)

| Navn | Værdi |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` fra `google-credentials.json` |
| `GOOGLE_PRIVATE_KEY` | `private_key` fra `google-credentials.json`, hele teksten inkl. `-----BEGIN/END PRIVATE KEY-----` |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Valgfri. Standard er det samme ark som Client |

Scope skal mindst være "Functions".

## Deploy

Træk-og-slip virker ikke med functions. Brug CLI'en fra denne mappe:

```
cd Netlify
npx netlify-cli login
npx netlify-cli link        # vælg det eksisterende site
npx netlify-cli deploy --prod
```
