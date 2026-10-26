# 8085 simulator — corrected project

A React/TypeScript 8085 simulator with a shared assembler/CPU execution model,
editable registers and RAM, breakpoints, subroutine stepping, stack inspection,
and 256 I/O ports.

## Run locally

Install Node.js 22.12+ (Node.js 24 LTS recommended). Extract this archive, open a
terminal in `gmusim-main`, and run:

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. The simulator and built-in offline programs need no API key. The AI API is included in the development server; no separate backend command is needed.

```sh
npm test          # CPU, assembler, execution lifecycle and React UI integration tests
npm run lint      # TypeScript check
npm run build     # Production bundle in dist/
npm start         # Serve dist/ AND the compiled assistant API (build first)
npm run preview   # Vite preview, also includes the assistant API
```

Compiled `dist/` and `build/` folders are included. Use `npm start` to serve the app and assistant API; opening
`index.html` directly via `file://` is not supported. Static-only hosting supports
the simulator and built-in offline help. OpenAI, Gemini and Ollama require the included
Node server. Rebuild after source changes.

## Quick check

The initial program reads `23H` from `2050H` and `46H` from `2051H`. Press **F9**:

- Register A becomes **69H** (105 decimal).
- Memory **2052H** becomes **69H**.
- Data, Memory and the left inspector show the same RAM byte.

Click **Reset** before executing a halted program again. To try other inputs,
assemble first, edit the inputs in the Data tab, then Run. `DB`, `DW` and `DS`
bytes are reinitialized when you assemble or reset.

## Controls and memory behavior

| Control | Action |
| --- | --- |
| F8 / Assemble | Validate source and load its machine code into RAM |
| F9 / Run | Continue until HLT, a breakpoint, Stop, or the instruction limit |
| F5 / Step In | Execute exactly one instruction |
| F6 / Step Over | Execute a CALL/RST and pause after it returns; otherwise step once |
| Escape / Stop | Pause and preserve execution state |
| Reset | Reset registers/flags and reload the assembled program |
| Gutter / breakpoint button | Toggle a breakpoint before an instruction executes |
| Ctrl+N, Ctrl+O, Ctrl+S | New buffer, open assembly source, save assembly source |

Registers, PC, SP, memory bytes and port values are hexadecimal. Enter or blur
commits register/table edits. The left inspector also has explicit Update
buttons. Decimal table edits accept 0–255. Invalid table/register edits revert
rather than silently wrapping. Flags can be toggled by clicking them.

- All panels read the same CPU RAM and I/O arrays. A write of `00H` is still a
  visible modification.
- Assembly/reset preserve RAM outside the addresses emitted by the assembler,
  and preserve I/O port values. This keeps manually entered inputs available.
- Run after HLT leaves the result visible; use Reset to restart. Run after a
  source or load-address change assembles automatically.
- Code begins at `4200H` by default. The load address is hexadecimal. An explicit
  `ORG` sets the following output location and takes precedence for that region.
- Keep code and data separate. Bundled examples use code at `4200H` and data
  around `2050H`. Writing over an instruction changes the executed program,
  just as it would in shared RAM on a real processor.
- Hex literals can use `H` or `0x`; binary uses `B`; plain immediate integers
  are decimal. For backward compatibility, bare 3–4 digit address operands are
  hexadecimal. Prefer explicit `H` suffixes to avoid ambiguity.
- Step Over honors breakpoints inside a subroutine. After such a pause, Run
  resumes normal execution; select Step Over again for a new call.
- Run yields to the UI every 500 instructions, and pauses after 1,000,000
  instructions per Run request. Press Run to continue an intentionally long loop.
- The keypad inserts an instruction before the editor cursor's current line.
  It supplies example operands, which you can edit before inserting.

## Repairs

- Removed simulated screenshot state and the hidden default breakpoint.
- Replaced separate Run/Step/Assemble paths with one testable execution model.
- Connected memory refresh versions and removed stale mirrored table values.
- Made Run interruptible; implemented actual subroutine Step Over.
- Fixed first-instruction breakpoints, continuation and PC/source highlighting.
- Connected register/PC/SP editors, keypad, keyboard shortcuts and I/O editors.
- Implemented previously missing parity/sign conditional CALL/RET and RIM/SIM
  register behavior; corrected decimal adjustment and conditional jump timing.
- Added operand/register/range validation and fixed binary literal parsing and
  case-sensitive character literals.
- Moved bundled sample code away from its data, repaired factorial, and checked
  the expected RAM results for every bundled example.
- Bounded write history and console history for long-running programs.
- Removed the conflicting direct esbuild dependency and included a lockfile.

## Verification and scope

The test suite checks CPU/assembler behavior and mounts the actual React app in
JSDOM to exercise memory edits across panels, Run/Stop, Step Over, breakpoints,
load-address changes, registers, ports, keypad and sample loading. All eight
bundled samples are checked for their expected results and code/data overlap.

This is an instruction-level educational simulator. RIM/SIM model masks and
serial state; asynchronous external interrupt delivery and cycle-accurate
peripheral timing are not implemented. Undocumented opcodes are not a supported
programming interface. The assembler supports labels and literal operands,
not arbitrary arithmetic expressions or macros.

Verification covers React/JSDOM integration, API request handling and fallback,
offline algorithms including zero/overflow edge cases, TypeScript, the production
build, and Chromium checks of the rendered inspector and code assistant.
Live provider authentication and local-model inference require the configured
provider to be reachable; provider routing is additionally tested with mocks.


## AI assistant and offline operation

The **+** at the top right opens the hideable assistant. It keeps the current chat
while you hide and reopen it. Use **Copy code** or **Use code (replace editor)**;
code is never run automatically. Include current editor code only when you want
it sent with your question. Replacing the editor clears existing breakpoints.

| Mode | Capability | Internet required? |
| --- | --- | --- |
| OpenAI | Custom 8085 programs, explanations and repairs | Yes |
| Gemini | Custom 8085 programs, explanations and repairs | Yes |
| Local AI (Ollama) | Custom programs and follow-up reasoning using a model on your computer | Only for initial installation/model download |
| Offline programs | 17 built-in examples, instruction help and editor syntax diagnosis | No |
| Auto | OpenAI, Gemini, configured local model, then built-in offline help | Falls back when providers are unavailable |

API keys are **not included in this deployment archive**. For local development,
copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`. For a deployed app,
set `OPENAI_API_KEY` in your hosting provider's secret/environment settings.
The default model is `gpt-4.1-mini` and can be changed with `OPENAI_MODEL`.
Never use a `VITE_*` name for a secret. The browser calls your own Node backend;
it never receives the provider key. OpenAI requests use structured JSON and
`store:false`. A program with assembly errors is blocked from loading into the
editor, and the backend can attempt one syntax repair.

The supplied OpenAI key was tested, but the live request received HTTP 429 and
no generated answer. The account's inference access could not be confirmed.
Run `npm run check:ai` after setting the key on your own host to test an actual
OpenAI-generated program through the assembler and emulator. The command fails
rather than reporting offline fallback as a successful AI check.

See **DEPLOYMENT.md** for Docker/Render setup, environment variables, an optional
assistant access code, health checks, and limits for public use.

### Custom offline AI setup (one time)

1. Install Ollama from https://ollama.com/download and leave it running.
2. With internet available, run:

   ```sh
   npm run setup:offline
   ```

   This downloads the configured `qwen2.5-coder:7b` model and enables it. It may
   use several GB of disk and memory. On a limited computer, set
   `OLLAMA_MODEL=qwen2.5-coder:1.5b` in `.env.local` before running setup. A smaller
   model generally has weaker coding ability; speed depends on your hardware.
3. Restart `npm run dev` (or `npm start` after a build), then choose **Local AI**.
   Keep the simulator and Ollama running on the same computer. You can now
   disconnect the internet. No cloud service is used in Local AI mode.

A hosted Node backend connects to Ollama on that server, not to the visitor's
laptop. Run this project locally to use your laptop's offline model. Auto tries
Ollama after configured cloud providers when `OLLAMA_ENABLED=true`; when the browser reports offline,
it tries Local AI directly. You can always choose Offline programs immediately.

The 17 built-in programs supply documented default inputs. They do not interpret
arbitrary constraints or substitute all numbers from a natural-language request.
For customized logic, use OpenAI, Gemini or the downloaded local model. No AI model can
guarantee every program is correct: the assistant checks assembly syntax and
attempts one repair, but you must test the algorithm and its output.

Production builds include a service worker that caches the app after the first
successful visit over HTTPS or localhost. Refreshing offline can then open the
app and built-in library. It does not cache API requests, chats or editor uploads.
First-time setup and dependency/model downloads require internet.

The API uses JSON size limits, bounded conversation context, same-origin checks,
and per-client request limits. The production server uses the hosting platform’s `PORT` and binds to `0.0.0.0`
when `NODE_ENV=production`. Development stays on localhost. Public deployments
have per-client, daily and concurrency limits; an optional access code can
restrict AI requests. These limits are in memory per server and reset on restart,
so multi-instance deployments need a shared limit store for consistent caps.

## Inspector design

The right panel follows the supplied classic GNUSim reference: grey notebook
tabs with a blue active underline; plain Data and Stack tables; a four-column
alphabetical instruction keypad; and Start/OK address controls for Memory and
I/O Ports. Drag the divider above the assembler console to resize the sections.
Click a Data address to inspect its memory location. Add a watch using the small
address field below the Data table. Memory and I/O Data cells use hexadecimal;
the adjacent Address column shows the decimal address.

Provider documentation: https://developers.openai.com/api/docs/guides/structured-outputs ,
https://ai.google.dev/api/generate-content and
https://docs.ollama.com/api ; model: https://ollama.com/library/qwen2.5-coder .


## Sidebar layout

The left sidebar follows the supplied reference: A, BC, DE, HL, PSW, PC, SP and
Int-Reg, with flags alongside. Register bytes remain editable. PC/SP show their
high and low bytes side by side; click the value to edit the complete four-digit
hexadecimal word. PSW and Int-Reg display CPU state. Flag buttons toggle the real
CPU flags. The converter accepts unsigned 16-bit values, and memory/port controls
validate hexadecimal bytes before writing. Initial memory inspection starts at
0000H; execution writes automatically focus the last written address.


### Program files

New (Ctrl+N) creates an untitled assembly program. Open (Ctrl+O) selects an `.asm` or `.txt` file from your computer and loads it into the editor. The title shows the filename and an asterisk for unsaved edits. New and Open ask before discarding edits, and closing the page warns about unsaved changes.

Save (Ctrl+S) and File → Save As (Ctrl+Shift+S) use the system save picker when the browser supports it on HTTPS or localhost. After opening or saving with a native picker, Save writes back to the selected file. Other browsers show a filename dialog and download the source; the browser controls the download location and may rename duplicate downloads. They cannot overwrite the original file directly. The + assistant button is part of the normal simulator toolbar and toggles the assistant panel.
