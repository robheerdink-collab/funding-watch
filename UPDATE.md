# Weekly update instructions

These are the instructions for the automated weekly update of Funding Watch
(https://robheerdink-collab.github.io/funding-watch/). The scheduled task clones this
repository and follows this file. Humans can edit it to change how the update works.

## What the page is for

A searchable overview of funding opportunities for the Division of Pharmacoepidemiology &
Clinical Pharmacology at Utrecht University: local (UU, UMC Utrecht and their alliances),
regional, national, European and international. Every entry has a clear deadline status,
a short summary in English and a link to the official call page. Researchers from master
students to PIs use it, so cast a wide net, including prizes and stipends.

## Files

| File | Role |
|---|---|
| `config/profile.json` | Division profile, the three centres, **all allowed values** (`vocabularies`) and the list of sources to search (`sources`). |
| `data/opportunities.json` | Active entries (open, upcoming, expected, rolling). |
| `data/archive.json` | Closed entries. Kept so recurring schemes can be watched for their next round. |
| `data/meta.json` | `lastRun`, `runSummary` and counts. The build fills in the counts. |
| `updates/YYYY-MM-DD.md` | One changelog per run. |
| `scripts/build.mjs` | Moves passed deadlines to the archive, validates everything, writes `deadlines.ics`, `opportunities.csv` and counts. |
| `index.html`, `assets/` | The page. **Do not change these during a weekly run.** If something looks broken, describe it in the changelog. |

## Entry schema

Every entry has exactly these fields. Values for `scope`, `funderType`, `type`,
`careerStages`, `themes`, `diseaseAreas`, `status`, `deadlineStage`, `phases`,
`recurrence` and `budget.currency` must come from `config/profile.json → vocabularies`.

```json
{
 "id": 203,
 "name": "Call name as the funder calls it, with round or year",
 "funder": "Short funder name, consistent with existing entries",
 "scope": "Local | Regional | National | European | International",
 "funderType": "…",
 "type": "…",
 "careerStages": ["PhD", "Postdoc"],
 "themes": ["Drug safety & pharmacovigilance"],
 "diseaseAreas": [],
 "summary": "2–4 sentences in your own words: what it funds, for whom, size, key conditions.",
 "budget": { "min": null, "max": 50000, "currency": "EUR" },
 "status": "Open | Upcoming | Rolling | Closed",
 "opens": "YYYY-MM-DD or null",
 "deadline": "YYYY-MM-DD or null (null only for Rolling)",
 "deadlineConfirmed": true,
 "deadlineStage": "Application | Pre-proposal | Full proposal | …",
 "phases": "1-phase | 2-phase | Varies | Unknown",
 "partnersRequired": false,
 "partnersNote": "",
 "recurrence": "…",
 "url": "https://… (official call or scheme page)",
 "added": "YYYY-MM-DD",
 "lastVerified": "YYYY-MM-DD or null"
}
```

Meaning of the date fields:

- `deadline` is the next deadline that matters for an applicant. For two-stage calls that is
  the next open stage (pre-proposal first, then full proposal); put the other stage's date in
  the summary.
- `deadlineConfirmed: true` only when the date is published on the funder's own page for this
  round. When a new round is expected but not announced, use the previous round's date plus
  the recurrence interval, set `deadlineConfirmed: false` and `status: "Upcoming"`. The page
  then shows it as "Expected" with month and year only.
- `opens` is the date applications open, when known. The page turns "Upcoming" into "Open"
  on that date by itself.
- Status and days left are calculated by the page from today's date. You do not need to flip
  Open to Closed; the build moves passed deadlines to the archive.
- `Rolling` is for calls without fixed deadlines. Use `deadline` for the next cut-off when
  there is one, otherwise null.

## Steps for each run

Work in the cloned repository. Today's date is the Europe/Amsterdam date.

1. **Housekeeping.** Run `node scripts/build.mjs`. It archives passed deadlines and lists
   warnings. Read `data/meta.json` for `maxId`.

2. **Re-check existing entries** against the official pages (WebFetch, WebSearch), in this order,
   and set `lastVerified` to today for every entry you actually checked:
   1. Open and Upcoming entries with a deadline in the next 60 days.
   2. Entries with `deadlineConfirmed: false` whose expected date is within the next 4 months:
      has the round been announced? Then set the real dates, `opens`, `deadlineConfirmed: true`.
   3. Rolling entries with a passed or missing next cut-off.
   4. The entries with the oldest `lastVerified` (null first) until you have checked at least
      25 entries in total.
   Correct deadlines, budgets, eligibility, URLs and summaries where they changed. If a call has
   been cancelled, set `status: "Closed"`; the build archives it.

3. **Watch the archive.** For recurring schemes in `data/archive.json` that closed in the last
   12 months, check whether the next round has been announced or is expected within 6 months.
   If so, add a **new** entry (new id, `added` today) for the new round. Never edit archived
   entries, and never add a round that is already in `opportunities.json`.

4. **Find new opportunities.** Search every scope in `config/profile.json → sources`,
   including **Local** and **Regional** and the **Prizes and stipends** list, plus open searches
   for the division's themes, for example:
   - "<funder> open call <year>", "<funder> subsidie <year>"
   - "pharmacoepidemiology OR drug safety OR pharmacovigilance research funding <year>"
   - "HTA OR pharmaceutical policy OR regulatory science grant <year>"
   - "sustainable pharmacy OR planetary health OR green healthcare research call <year>"
   - "medication adherence OR pharmacy practice OR clinical pharmacy research grant <year>"
   - "proefschriftprijs OR afstudeerprijs farmacie <year>", "travel grant pharmacoepidemiology <year>"
   - "Universiteit Utrecht interne financiering <year>", "UMC Utrecht call <year>",
     "provincie Utrecht subsidie onderzoek <year>"
   Add every relevant call that is open, upcoming or expected within 12 months. Relevant means a
   researcher in the division could realistically apply, alone or with partners. When in doubt,
   include it. New ids continue from `maxId`; set `added` and `lastVerified` to today.

5. **Suggestions.** If `gh issue list --label suggestion --state open` works, process each
   suggested call: add or update it, then comment what you did and close the issue. If `gh`
   is not authorised, skip this step and say so in the changelog.

6. **Build and validate.** Run `node scripts/build.mjs` again. If it reports errors, fix the
   data and run it again. **Never push when the build fails.** If you cannot fix it, stop,
   do not push, and report the errors.

7. **Changelog.** Write `updates/YYYY-MM-DD.md` (template below). In `data/meta.json` set
   `lastRun` to the current time (ISO 8601 with offset) and `runSummary` to one line such as
   "3 new, 11 updated, 4 archived". Then run `node scripts/build.mjs` once more so the counts match.

8. **Commit and push** to `main`:
   `git add -A && git commit -m "Weekly update YYYY-MM-DD: N new, M updated, K archived"`,
   then `git push origin main`. If the push is rejected because main moved, run
   `git pull --rebase origin main`, run the build again and push once more.

9. **Report.** End with a short summary: counts, the most relevant new calls, URL fixes,
   anything you could not verify, and every deadline in the next 14 days marked URGENT.

## Rules

- Never invent a URL, date, amount or eligibility rule. If you cannot confirm something,
  leave it null or say so in the summary.
- Link to the official call or scheme page. Prefer stable scheme pages over year-specific
  news items. If only a parent page exists, use it and say so in the summary.
- Write summaries in English, in your own words. Do not copy text from funder sites.
- Use only values from the vocabularies. If a genuinely new value is needed, do not add it
  yourself; use the closest existing value and mention it in the changelog.
- Some sites block automated fetching (for example ewuu.nl). If a page cannot be read,
  leave the entry as it is, keep its `lastVerified`, and list it in the changelog under
  "Could not verify".
- Keep `funder` names consistent with existing entries so the funder sort stays clean.
- Do not change `index.html`, `assets/`, `scripts/`, `.github/` or `config/` during a weekly run.

## Changelog template

```markdown
# Funding Watch update YYYY-MM-DD

**Active:** N · **Archived this run:** K · **New:** X · **Updated:** M

## New
- [id] Name — funder — deadline (why relevant, one line)

## Updated
- [id] Name — what changed

## URL fixes
- [id] old → new

## Could not verify
- [id] Name — reason

## URGENT — deadlines within 14 days
- DD Mon — [id] Name
```
