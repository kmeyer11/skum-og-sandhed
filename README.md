# SkumOgSandhed

Øl-arkiv med data fra Google Sheets.

## Kør med Docker

Appen kører som **én container**: både web-UI og `/api/beers`.

1. Læg en Google service account JSON-fil i projektroden som `google-credentials.json`.
2. Del Google-arket med service accountens e-mail (læseadgang er nok).
3. Start:

```bash
docker compose up --build
```

4. Åbn [http://localhost:8008](http://localhost:8008).

Kopiér `.env.example` til `.env` hvis du vil pege på en anden credentials-fil eller et andet spreadsheet.

Uden Docker:

```bash
dotnet run --project Client
```

Google-klienten bruger Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS` eller `gcloud auth application-default login`).
