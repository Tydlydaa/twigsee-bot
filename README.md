# 🌱 Twigsee Bot

Tento repozitář obsahuje automatického bota, který:

📅 se každý den přihlásí do platformy [Twigsee](https://admin.twigsee.com)
📆 postupně vybere všechny školky z přehledu
📆 stáhne docházku za **předchozí den** jako `.xls`
📆 a uloží ji do Google Sheets, každou školku zvlášť do jejího listu

Plně automatizováno přes **GitHub Actions** (každý den v 8:00 UTC+1).

---

## 🛠 Co potřebuješ k nastavení

### 1. Google Sheet dokument

* Vytvoř nový soubor na [https://sheets.google.com](https://sheets.google.com)
* **Zkopíruj jeho ID** z URL (část mezi `/d/` a `/edit`)

Např. z URL:

```
https://docs.google.com/spreadsheets/d/1ABCDefGhijkLmNOpQRstUVWXyz1234567/edit#gid=0
```

je ID:

```
1ABCDefGhijkLmNOpQRstUVWXyz1234567
```

---

### 2. Google Service Account

1. Jdi na [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Vytvoř nový projekt (např. `twigsee-dochazka`)
3. Aktivuj API:

   * Google Sheets API
   * Google Drive API
4. Vytvoř **service account** a vygeneruj `credentials.json`
5. Vlož tento účet jako „editor“ do svého Google Sheet dokumentu (přes jeho `client_email`)
6. Zakóduj celý obsah `credentials.json` do base64:

```bash
base64 -i credentials.json | pbcopy   # macOS
```

---

### 3. GitHub Secrets (repo → Settings → Secrets → Actions)

| Název                     | Popis                                      |
| ------------------------- | ------------------------------------------ |
| `TWIGSEE_EMAIL`           | Přihlašovací e-mail do Twigsee             |
| `TWIGSEE_PASSWORD`        | Heslo do Twigsee                           |
| `GOOGLE_CREDENTIALS_JSON` | base64 zakódovaný obsah `credentials.json` |

---

## 📁 Struktura projektu

```
twigsee-bot/
├── .github/workflows/
│   └── main.yml             # GitHub Action workflow (spouští bota)
├── bot/
│   ├── index.js             # Puppeteer skript (Twigsee automatizace)
│   └── downloads/           # Složka pro ukládání .xls exportů
├── sheets/
│   └── upload.js            # Parsuje XLS a posílá do Google Sheets
└── README.md
```

---

## ⚙️ Jak to funguje

1. GitHub Action spustí `bot/index.js`
2. Puppeteer:

   * přihlásí se do Twigsee
   * zjistí seznam všech dostupných skolek z dropdownu
   * pro každou školku:

     * vybere ji
     * přejde na stránku docházky
     * klikne na tlačítko Export
     * stáhne `.xls` soubor přes `fetch()`
     * uloží jako `dochazka_<datum>_<nazev>.xls`
3. Skript `sheets/upload.js`:

   * pro každý stažený soubor:

     * zjistí název školky
     * odstraní prefix "Dětská skupina" nebo "Lesní mateřská škola"
     * v Google Sheet vytvoří / doplní list s daným názvem
     * přidá řádky za daný den do konce listu (bez mazání starých dat)
     * doplní do sloupce `A` název sloupce `Datum` a pak datum exportovaných údajů

---

## 🕒 Automatické spouštění

Workflow se spouští každý den v **8:00 ráno (UTC+1)** a stahuje data za **předchozí den**.

---

## ✅ Hotovo!

Tvůj vlastní Twigsee exportní bot je připraven běžet každý den úplně sám.
Pokud budeš chtít přidat více skolek, upravit formát nebo zasílat notifikace, snadno to rozšíříš.

---

Sestaveno s ❤️ a pořádnou dávkou Puppeteer magie.
