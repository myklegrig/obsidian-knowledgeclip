import assert from "node:assert/strict";
import { test } from "node:test";

import {
  findYouTubeLink,
  formatHours,
  isSingleYouTubeLink,
  nextPollDelay,
  placeFinished,
  placeholderLine,
  safeFileName,
  stripFrontmatter,
  youtubeVideoId,
} from "../src/logic.ts";

test("video id from every link shape YouTube hands out", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
    "https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=OWNER",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ?feature=share",
  ]) {
    assert.equal(youtubeVideoId(url), "dQw4w9WgXcQ", url);
  }
  assert.equal(youtubeVideoId("https://vimeo.com/123"), null);
  assert.equal(youtubeVideoId("https://www.youtube.com/@channel"), null);
});

test("only a lone link opens the window on paste", () => {
  assert.ok(isSingleYouTubeLink("  https://youtu.be/dQw4w9WgXcQ\n"));
  assert.ok(!isSingleYouTubeLink("see https://youtu.be/dQw4w9WgXcQ later"));
  assert.ok(!isSingleYouTubeLink("https://example.com"));
});

test("link under cursor — bare or inside markdown", () => {
  assert.equal(
    findYouTubeLink("watch [this](https://youtu.be/dQw4w9WgXcQ)."),
    "https://youtu.be/dQw4w9WgXcQ",
  );
  assert.equal(
    findYouTubeLink("https://example.com and https://www.youtube.com/watch?v=dQw4w9WgXcQ,"),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  );
  assert.equal(findYouTubeLink("no links here"), null);
});

const NOTE = "---\ntitle: \"A talk\"\n---\n\n# A talk\nbody\n";

test("the finished note takes the placeholder's place", () => {
  const doc = `before\n${placeholderLine("n1", "⏳ wait")}\nafter`;
  const next = placeFinished(doc, "n1", NOTE);
  assert.equal(next, "before\n# A talk\nbody\nafter");
});

test("frontmatter survives only at the very top of the file", () => {
  const doc = `\n${placeholderLine("n1", "⏳")}\n`;
  assert.ok(placeFinished(doc, "n1", NOTE)?.includes("title: \"A talk\""));
});

test("a removed placeholder is reported, not silently dropped", () => {
  assert.equal(placeFinished("nothing here", "n1", NOTE), null);
  assert.equal(placeFinished(placeholderLine("other", "⏳"), "n1", NOTE), null);
});

test("frontmatter is stripped cleanly", () => {
  assert.equal(stripFrontmatter(NOTE), "# A talk\nbody\n");
  assert.equal(stripFrontmatter("# no header"), "# no header");
});

test("file names lose characters Obsidian forbids", () => {
  assert.equal(safeFileName('Talk: "why" / how?', "x"), "Talk why how");
  assert.equal(safeFileName("  ", "fallback"), "fallback");
  assert.ok(safeFileName("a".repeat(300), "x").length <= 100);
});

test("polling backs off and caps", () => {
  assert.equal(nextPollDelay(0), 3000);
  assert.ok(nextPollDelay(3) > nextPollDelay(2));
  assert.equal(nextPollDelay(50), 30000);
});

test("hours read like the web app", () => {
  assert.equal(formatHours(240), "4");
  assert.equal(formatHours(234), "3.9");
  assert.equal(formatHours(-5), "0");
});
