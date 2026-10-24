# KnowledgeClip for Obsidian

Paste a YouTube link into a note and get a structured, timestamped summary of
the video — every timestamp is a link that opens the video at that second.

Works on desktop and mobile.

## What it does

- **Paste a YouTube link** → a small window asks for the detail level and the
  model, and shows what the note will cost from your monthly hours *before*
  you press the button.
- The note is made on KnowledgeClip's servers (usually a minute or two). A
  placeholder sits in your vault meanwhile; when the note is ready it takes the
  placeholder's place. Close Obsidian in between — it picks up where it left
  off next time.
- Notes land either **in a new file** (linked from where you pasted) or
  **right under the link** — your choice in the plugin options.
- New files get properties Obsidian understands: `source`, `video_id`,
  `duration`, `created`, `tags: [knowledgeclip]`.

Commands:

- **Make note from link under cursor**
- **Make note from a YouTube link…**

## Setup

1. Sign in at [knowledgeclip.app](https://knowledgeclip.app) (free plan works).
2. Open **Settings → API keys** in the web app and create a key. It is shown
   once — copy it.
3. In Obsidian: **Settings → Community plugins → KnowledgeClip**, paste the key,
   press **Check**.

## Install

Until the plugin is in the community catalog, install it with
[BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install and enable **BRAT** from Community plugins.
2. BRAT → **Add beta plugin** → `myklegrig/obsidian-knowledgeclip`.
3. Enable **KnowledgeClip** in Community plugins.

Manual: download `main.js`, `manifest.json` and `styles.css` from the latest
release into `<vault>/.obsidian/plugins/knowledgeclip/`.

## Privacy

The plugin talks only to the KnowledgeClip API (`api.knowledgeclip.app`, or
the address you set). It sends the YouTube link you chose and your API key —
nothing else from your vault. No telemetry.

## Development

```bash
npm install
npm run dev     # rebuilds main.js on change
npm run build   # type-check + production bundle
npm test        # pure logic tests (node:test)
```

## License

MIT
