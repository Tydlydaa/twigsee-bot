# 🌱 Twigsee Bot

Tento repozitář obsahuje automatického bota, který:

📅 se každý den přihlásí do platformy [Twigsee](https://admin.twigsee.com)
📆 vybere zvolené zařízení (školku)
📆 stáhne docházku za dnešní den jako `.xls`
📆 a uloží ji do Google Sheets

Plně automatizováno přes **GitHub Actions** (každý den v 6:00 UTC).

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

| Název                     | Popis                                            |
| ------------------------- | ------------------------------------------------ |
| `TWIGSEE_EMAIL`           | Přihlašovací e-mail do Twigsee                   |
| `TWIGSEE_PASSWORD`        | Heslo do Twigsee                                 |
| `SCHOOL_NAME`             | Název školky (např. `Dětská skupina Mezi květy`) |
| `GOOGLE_CREDENTIALS_JSON` | base64 zakódovaný obsah `credentials.json`       |

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
   * vybere školku pomocí Select2 dropdownu
   * přejde na stránku s docházkou
   * klikne na tlačítko Export
   * vytáhne URL odkazu
   * stáhne `.xls` přes `fetch()` přímo z prohlížeče
3. Soubor se uloží do `bot/downloads/dochazka_<datum>.xls`
4. Skript `sheets/upload.js`:

   * načte poslední `.xls`
   * doplní datum ke každému řádku
   * přidá data jako nové řádky do Google Sheet

---

## 🕒 Automatické spouštění

Workflow se spouští každý den v **6:00 UTC** (tedy 7:00 nebo 8:00 ráno SEČ dle letního času).

---

## ✅ Hotovo!

Tvůj vlastní Twigsee exportní bot je připraven běžet každý den úplně sám.
Pokud budeš chtít přidat více skolek, upravit formát nebo zasílat notifikace, snadno to rozšíříš.

---

Sestaveno s ❤️ a pořádnou dávkou Puppeteer magie.
