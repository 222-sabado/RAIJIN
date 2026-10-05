# Printer Discovery, Telemetry, and Real Printing — Design

Date: 2026-10-05
Status: Approved in chat, sections 1–4.

## Goal

Replace the simulated printer with real printers.
The server finds the printers that are available, reads their real telemetry, and prints manuscripts on them.

## Decisions

| Topic | Decision |
|---|---|
| Kiosk host | Linux with CUPS. |
| Printer types | USB and network. Each value shows only when the printer reports it. |
| Discovery and telemetry | CUPS command-line tools. No new npm packages. |
| Printer selection | The admin sets one kiosk printer. Students print to it. |
| Install | The admin can install a discovered printer from the UI (`lpadmin -m everywhere`). |
| Real printing | Yes. The Print button sends the real file. |
| DOCX printing | Convert to PDF with headless LibreOffice at print time. |
| Simulation | Keep only as a labeled dev printer behind `PRINTER_SIM=1`. |
| Page count | Real count. Fix the random `pageCount` at upload. |
| Auth | KD-1 stays. Admin routes check `requesterId` like the delete route. |
| Removed | `/api/printer/refill`, `/api/printer/toggle-connection`, fake paper stack, door sensor, SNMP latency, sheet counts. |

## Host Requirements

The kiosk host needs these packages:

- `cups`, `cups-ipp-utils` (gives `ipptool`), `cups-filters`
- `avahi-daemon` (network discovery), `ipp-usb` (driverless USB printers)
- `libreoffice-writer` (gives `soffice`, DOCX conversion)
- `poppler-utils` (gives `pdfinfo`, page count)
- `unzip` (reads the DOCX page count at upload)

The server user must be in the `lpadmin` group to install printers.

## Section 1 — Architecture

New server module `printers/` at the repo root, next to `server.ts`.

| File | Purpose |
|---|---|
| `printers/cups.ts` | Wraps the CUPS tools. Runs each command with `execFile` and an argument array, never a shell. Parses the output. |
| `printers/convert.ts` | Converts DOCX to PDF with `soffice --headless --convert-to pdf`. Reads page counts with `pdfinfo` and `unzip -p`. |
| `printers/sim.ts` | The dev printer. Active only when `PRINTER_SIM=1`. Same interface as CUPS. |
| `printers/registry.ts` | Runs scans, caches printers, polls telemetry, tracks jobs, stores the kiosk printer choice. |

### CUPS command map

| Need | Command |
|---|---|
| Find devices not yet installed | `lpinfo -v` (includes `dnssd://`, `ipp://`, `usb://`) |
| Installed queues | `lpstat -v`, `lpstat -p -l` |
| State reasons | `printer-state-reasons` from `lpoptions -p <queue>` |
| Ink and toner levels | `marker-names`, `marker-levels`, `marker-colors`, `marker-types` from `lpoptions -p <queue>` |
| Install | `lpadmin -p <queue> -E -v <uri> -m everywhere` |
| Print | `lp -d <queue> -t <title> <file>` |
| Job state | `ipptool` IPP `Get-Job-Attributes` on `ipp://localhost/jobs/<id>` |

### Printer model

This model replaces `PrinterStatus` in `src/types.ts`.

```ts
interface Printer {
  id: string;                 // CUPS queue name, or 'sim'
  name: string;
  source: 'cups' | 'sim';
  installed: boolean;
  uri: string;
  model?: string;
  location?: string;
  state: 'idle' | 'printing' | 'stopped' | 'offline' | 'unknown';
  reasons: string[];          // IPP keywords, e.g. 'media-empty'
  markers: { name: string; color?: string; level: number | null }[];
  isKiosk: boolean;
  lastPolled: string;         // ISO time
  error?: string;
}

interface DiscoveredDevice {
  uri: string;
  makeModel: string;
  info: string;
}
```

A value of `null` means the printer did not report it.
The UI shows "Not reported" for it.
The model has no paper tray or sheet count, because CUPS does not report them.

### Kiosk printer storage

The registry stores the kiosk printer id in `data/kiosk-printer.json`.
The choice survives a restart.
`data/` goes into `.gitignore`.
All other state stays in memory, as in the rest of the app.

### Polling

- One scan runs at server start and on each admin Rescan.
- Only one scan runs at a time. A second request waits for the scan that is running.
- The kiosk printer is polled every 10 s.
- Other installed printers are polled when the admin printer list is requested.
- Jobs that are not final are updated every 10 s and when a student opens Printed Manuscripts.

## Section 2 — API and UI

### API

| Route | Caller | Result |
|---|---|---|
| `GET /api/printer/status` | everyone | `{ printer: Printer \| null, cupsAvailable: boolean }` for the kiosk printer |
| `GET /api/printers?requesterId=` | admin | `{ installed: Printer[], discovered: DiscoveredDevice[], scannedAt, cupsAvailable }` |
| `POST /api/printers/rescan` | admin | Runs a new scan. Returns the same shape as `GET /api/printers`. |
| `POST /api/printers/install` | admin | Body `{ requesterId, uri, name }`. Runs `lpadmin`. |
| `PUT /api/printers/kiosk` | admin | Body `{ requesterId, printerId }`. Sets the kiosk printer. |
| `POST /api/printers/sim/fault` | admin, sim only | Body `{ requesterId, reason \| null }`. Sets a fault on the sim printer. |
| `POST /api/user/:userId/print` | student | Real print. See Section 3. |
| `GET /api/user/:userId/prints` | student | Jobs with live status. |

Admin routes return 403 JSON when the requester is not an admin.
`/api/printer/refill` and `/api/printer/toggle-connection` are removed.

### Install validation

- The `uri` must be in the device list of the latest scan.
- The `name` must match `^[A-Za-z0-9_-]{1,64}$`.
- A failed `lpadmin` returns 502 JSON with a short reason.

### Reason labels

| IPP keyword prefix | Label | Blocks printing |
|---|---|---|
| `media-empty`, `media-needed` | Out of paper | Yes |
| `media-jam` | Paper jam | Yes |
| `door-open`, `cover-open` | Cover open | Yes |
| `marker-supply-empty`, `toner-empty` | Out of ink: <marker> | No |
| `marker-supply-low`, `toner-low` | Low ink: <marker> | No |
| `offline-report`, `offline` | Offline | Yes |
| anything else | the keyword, made readable | No |

Severity suffixes `-error`, `-warning`, `-report` are removed before matching.
The state `offline` or `stopped` also blocks printing.

### UI changes

| Component | Change |
|---|---|
| `Navbar` | Chip with kiosk printer name, state dot, and lowest ink level or "Ink: Not reported". "No printer configured" when none is set. |
| `PrinterTelemetryCard` | Rewrite. State, reason labels, one bar per marker in its reported color, model, URI, last poll. Remove fake fields. |
| `AdminDashboard` printer tab | Installed printers with a telemetry card and "Set as kiosk printer". "Found, not installed" list with Install and a queue name field. Rescan button. CUPS missing message. DEV badge and fault control for the sim printer. |
| `StudentDashboard` printer tab | Kiosk printer telemetry, read-only. |
| `PrintModal` | Shows the kiosk printer and state. Disables Print with the reason when printing is blocked. Shows Queued, then follows the job status. |
| Printed Manuscripts tab | Live job status: Queued, Printing, Completed, Failed. |
| `App` | Remove refill and toggle handlers. Poll `/api/printer/status` every 10 s as now. |

### PrintJob model

`PrintJob` gets `cupsJobId?: number`, `printerId: string`, `printerName: string`, and `error?: string`.
`inkUsedPercent` is removed, because no source reports it.

## Section 3 — Print Flow and Errors

### `POST /api/user/:userId/print`

1. Check that the user, the manuscript, and its stored file exist. A text-only admin upload prints its `fullText` as `text/plain`.
2. Poll the kiosk printer again.
3. Return 409 JSON with the label when there is no kiosk printer, the state is `offline` or `stopped`, or a reason blocks printing.
4. Write the file to a new temporary directory for the job.
5. Convert a DOCX file to PDF with `soffice`, timeout 60 s. On failure return 502 "Could not convert the DOCX file for printing".
6. Read the page count with `pdfinfo` and update `ms.pageCount`.
7. Run `lp -d <queue> -t <title> <file>`. Read the job id from `request id is <queue>-<id>`. On failure return 502 with a short CUPS reason.
8. Delete the temporary directory. CUPS keeps its own spool copy.
9. Save the job with status Queued. Increase `printsCount`. Keep the existing "bookmark also" behavior.
10. Write a system log entry.

### Job state map

| IPP `job-state` | App status |
|---|---|
| 3 pending, 4 pending-held | Queued |
| 5 processing | Printing |
| 9 completed | Completed |
| 6 processing-stopped, 7 canceled, 8 aborted | Failed, with `job-state-reasons` |

### Robustness

- Every command uses `execFile` with an argument array and a timeout: 10 s, or 60 s for `soffice`.
- When `lpstat` is missing, the API reports `cupsAvailable: false`. The admin page shows "CUPS is not installed on this server" and the package list.
- When `soffice`, `pdfinfo`, `ipptool`, or `unzip` is missing, only the related operation fails. Its message names the missing package.
- Scan, install, kiosk change, print, and job failure each write to the system log.

### Sim printer

- Name "Simulated printer (dev)", `source: 'sim'`, id `sim`.
- A job moves Queued → Printing → Completed in about 6 s.
- Ink levels drop a little per job.
- The admin fault control sets a reason such as `media-empty` to test the 409 path.

## Page Count at Upload

- PDF: `pdfinfo` gives the exact count.
- DOCX: read `<Pages>` from `docProps/app.xml` with `unzip -p`. When it is missing, `pageCount` stays unset and the UI shows "—".
- The first print replaces the count with the real count from the converted PDF.
- The random `pageCount` in the upload route is removed.

## Section 4 — Testing

### Unit tests

Run with `bun run test`.

- Parsers, with real CUPS output saved as fixtures: `lpinfo -v`, `lpstat -p -l`, `lpstat -v`, `lpoptions -p`, `lp`, `ipptool` job state, `pdfinfo`, `docProps/app.xml`.
- Reason labels and blocking rules.
- Job state map.
- Install validation: name pattern, URI from the latest scan.
- Registry with a fake command runner: single scan at a time, kiosk choice saved and loaded, `cupsAvailable: false` when CUPS is missing.
- Print route errors: 409 per blocking reason, 502 for a failed conversion, 502 for a failed `lp`.

### Integration on real CUPS in WSL

The founder runs this once:

```bash
sudo apt install cups cups-ipp-utils cups-filters avahi-daemon ipp-usb libreoffice-writer poppler-utils unzip
sudo usermod -aG lpadmin $USER
sudo service cups start
sudo service avahi-daemon start
```

- Run `ippeveprinter` as a virtual IPP Everywhere printer with set supply levels. It keeps each received job in a folder.
- Print a PDF and a converted DOCX. Check that the received file is a PDF with the expected page count.
- Run `cupsdisable` on the queue to test the stopped state.

### Browser E2E

Playwright in the job temporary directory, at 1440 px and 390 px.

- Admin: Rescan, see the virtual printer, Install, set it as kiosk printer, see the real state and ink levels in the navbar.
- Student: print a PDF and a DOCX. The job moves from Queued to Completed with the correct page count.
- Stopped queue: the print modal blocks with the reason.
- CUPS missing from `PATH`: the admin page shows the CUPS message.
- Sim printer shows only with `PRINTER_SIM=1`.
- Inspect screenshots for layout defects.

### Known limits of the dev setup

- WSL2 uses NAT, so mDNS from the virtual printer may not appear in `lpinfo -v`. If so, the test installs it by its direct `ipp://localhost:8631/...` URI. Discovery over dnssd is then a kiosk check.
- The Canon TS200 is on Windows USB, so WSL cannot see it without `usbipd`. The USB path is a kiosk check.

### Kiosk checklist (manual, on the real Linux host)

1. Connect a USB printer and a network printer.
2. Rescan. Both appear under "Found, not installed".
3. Install both. Both appear as installed with a state.
4. Check that ink levels match the printer panel, or show "Not reported".
5. Set one as kiosk printer. The navbar shows it.
6. Remove the paper. Within 10 s the card shows "Out of paper" and Print is blocked.
7. Load paper. Print a PDF and a DOCX. Both print and reach Completed.

### Gates

`bun run lint`, `bun run test`, `code-reviewer`, then founder review.

## Affected Files

- New: `printers/cups.ts`, `printers/convert.ts`, `printers/sim.ts`, `printers/registry.ts`, their tests and fixtures.
- Changed: `server.ts`, `src/types.ts`, `src/data/mockDatabase.ts`, `src/App.tsx`, `src/components/Navbar.tsx`, `src/components/PrinterTelemetryCard.tsx`, `src/components/PrintModal.tsx`, `src/components/AdminDashboard.tsx`, `src/components/StudentDashboard.tsx`, `.gitignore`.
- Founder edits (agents may not edit these files):
  - `CLAUDE.md`: add the host requirements and the `printers/` module.
  - `.claude/PROJECT.json`: add the new component rows and the `printers` lane path.
  - `src/data/mockDatabase.ts` is not on that list, so agents remove `INITIAL_PRINTER_STATUS` there.
