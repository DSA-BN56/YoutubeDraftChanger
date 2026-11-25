# YouTube Studio Drafts to Private --- Tampermonkey Userscript

A small Tampermonkey helper for YouTube Studio. It finds videos marked
**Draft** on the currently open Videos page and walks through the draft
editor, selecting **Private** visibility and saving the video.

> **Important:** This script also selects **"No, it's not made for
> kids"** for every draft it processes. YouTube's audience setting is a
> legal/content classification, not a general preference. Only use this
> automation for videos that are genuinely **not made for kids**. If a
> video is made for kids, do not run this script on it.

## Features

-   Detects Draft rows that have an **Edit draft** control on the
    current YouTube Studio Videos page.
-   Opens each matching draft and advances through the editor:
    1.  Selects **No, it's not made for kids**.
    2.  Clicks **Next** on Details.
    3.  Clicks **Next** on Video elements.
    4.  Clicks **Next** on Initial check.
    5.  Selects **Private** visibility.
    6.  Clicks **Save**.
-   Provides a compact **Draft helper** launcher that can be opened when
    needed.
-   The launcher and expanded panel can be dragged to another screen
    position.
-   Remembers the launcher and panel positions in the browser's local
    storage.
-   Includes **Start** and **Stop** controls, status text, and a
    progress log.
-   Stops if it cannot find an expected page or control, instead of
    continuing blindly.

## Requirements

-   A desktop Chromium-based browser such as Brave or Chrome.
-   Tampermonkey installed and enabled.
-   Tampermonkey allowed to run userscripts on
    `https://studio.youtube.com/`.
-   YouTube Studio access to the channel containing the draft videos.

In Brave, check `brave://extensions/` → Tampermonkey → **Details**. Make
sure the extension is enabled, YouTube Studio is allowed under Site
access, and **Allow User Scripts** is enabled if Brave displays that
option.

## Installation

1.  Install the Tampermonkey browser extension.
2.  Open the Tampermonkey Dashboard.
3.  Choose **Create a new script**.
4.  Open `youtube_studio_finish_drafts.user.js` from this repository.
5.  Copy the entire file into the Tampermonkey editor, replacing its
    contents.
6.  Save with `Ctrl + S`.
7.  Open or refresh YouTube Studio.

The small **Draft helper** launcher should appear on the page. Click it
to open the full panel. Use the title bar to drag the panel, or drag the
launcher itself to move it.

## How to use

1.  In YouTube Studio, open **Content → Videos** for the channel you
    want to process.
2.  Review the Draft videos on the currently loaded page.
3.  Click the **Draft helper** launcher to open the panel.
4.  Click **Start** and confirm the prompt.
5.  Watch the status and log as each draft is processed.
6.  Click **Stop** to request that the automation stop.

The script processes one draft at a time. It waits for the editor to
close after saving before looking for another draft.

## Important behaviour and limitations

-   **Audience setting:** Every processed draft is set to **"No, it's
    not made for kids."** This is hard-coded in the script. Review the
    audience classification yourself and only run it on videos for which
    that setting is correct.
-   **Visibility:** Every successfully processed draft is saved as
    **Private**. It is not set to Unlisted or Public.
-   **Current page only:** The script scans the videos currently
    rendered on the open Videos page. It does not navigate through
    pagination or automatically load more rows. If your channel has
    multiple pages of videos, process each page separately.
-   **Stop behaviour:** Stop is checked between automation steps. A
    click or save already in progress may complete before the script
    stops.
-   **No guaranteed recovery:** The processed-title list and progress
    counters are held in memory. A page refresh resets them. If
    interrupted, review the videos' current status before starting
    again.
-   **Duplicate titles:** The current-page duplicate check uses the
    displayed video title. Videos with identical titles may not be
    distinguished reliably during one run.
-   **YouTube interface changes:** YouTube Studio is a dynamic web
    application. If its labels, layout, or controls change, the script
    may stop with a timeout or fail to find a control. Review the result
    manually.
-   **Save verification:** The script waits for the editor to close
    after clicking Save, but you should still verify the video's
    visibility in YouTube Studio.
-   **Use at your own risk:** This is an unofficial browser automation
    helper. It is not affiliated with or endorsed by YouTube or Google.
    Keep a backup of important work and supervise the run.

## Troubleshooting

### The launcher does not appear

1.  Confirm the userscript is enabled in the Tampermonkey Dashboard.
2.  Check Tampermonkey's site access for `studio.youtube.com`.
3.  In Brave, confirm **Allow User Scripts** is enabled if that setting
    is shown.
4.  Refresh YouTube Studio with `Ctrl + Shift + R`.
5.  Open Developer Tools → Console and check for red errors.

### The launcher appears, but no drafts are processed

-   Make sure you are on **Content → Videos**.
-   Confirm the rows show **Draft** and have an **Edit draft** button.
-   Keep the page open and visible while the script runs.
-   If the script stops, read the status and log message in the helper
    panel.

### The panel is in the way

-   Drag the small launcher to a free corner.
-   Open the panel and drag its title bar to move it.
-   The chosen positions are remembered in that browser.

## Repository contents

Suggested repository layout:

``` text
youtube-studio-drafts-to-private/
├── README.md
└── youtube_studio_finish_drafts.user.js
```

## Version

Current userscript version: **1.3**

## Disclaimer

This project automates actions in the YouTube Studio user interface.
YouTube may change that interface at any time. Always supervise the
automation and verify the final video settings manually.
