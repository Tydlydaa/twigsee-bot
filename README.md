# Twigsee Bot

Tento repozitář obsahuje bota, který se každý den přihlásí do Twigsee, stáhne docházku a uloží ji do Google Sheets.

## Nastavení

1. Vytvoř si Google Sheet a získej jeho ID (najdeš v URL).
2. Vytvoř si Google service account, stáhni `credentials.json` a zakóduj ho base64.
3. Vlož následující GitHub Secrets:
   - `TWIGSEE_EMAIL`
   - `TWIGSEE_PASSWORD`
   - `SCHOOL_NAME`
   - `GOOGLE_CREDENTIALS_JSON`

## Spuštění

Workflow se spouští automaticky každý den v 6:00 UTC.
