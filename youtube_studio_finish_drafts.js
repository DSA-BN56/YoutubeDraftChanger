// ==UserScript==
// @name         YouTube Studio - Finish Drafts as Private
// @namespace    Boo.YouTubeStudioTools
// @version      1.3
// @description  Movable on-demand helper for processing Draft videos with Private visibility.
// @match        https://studio.youtube.com/channel/*
// @match        https://studio.youtube.com/videos/*
// @match        https://studio.youtube.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // ---------- Configuration ----------
  const CHECK_INTERVAL_MS = 700;
  const STEP_TIMEOUT_MS = 30000;
  const BETWEEN_VIDEOS_MS = 1800;

  let running = false;
  let busy = false;
  let processed = new Set();
  let completed = 0;
  let failed = 0;

  // ---------- Small control panel ----------
  const panel = document.createElement('div');
  panel.id = 'boo-draft-helper';
  panel.style.cssText = [
    'position:fixed', 'right:18px', 'bottom:18px', 'z-index:999999',
    'width:310px', 'padding:12px', 'background:#202124', 'color:#fff',
    'border:1px solid #5f6368', 'border-radius:10px',
    'box-shadow:0 4px 18px rgba(0,0,0,.35)',
    'font:13px Arial,sans-serif', 'display:none'
  ].join(';');

  // Build the panel with DOM methods. Do not use innerHTML:
  // YouTube Studio enforces Trusted Types and blocks string HTML assignments.
  const headingRow = document.createElement('div');
  headingRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px';

  const heading = document.createElement('div');
  heading.textContent = 'Draft video helper';
  heading.style.cssText = 'font-weight:bold;font-size:14px';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = '×';
  closeButton.title = 'Hide Draft helper';
  closeButton.style.cssText = 'border:0;background:transparent;color:#fff;font-size:22px;line-height:20px;cursor:pointer;padding:0 4px';
  headingRow.append(heading, closeButton);
  panel.appendChild(headingRow);

  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display:flex;gap:8px;margin-bottom:8px';

  const startButton = document.createElement('button');
  startButton.id = 'boo-start';
  startButton.textContent = 'Start';
  startButton.style.cssText = 'flex:1;padding:8px;border:0;border-radius:6px;background:#1a73e8;color:white;cursor:pointer';

  const stopButton = document.createElement('button');
  stopButton.id = 'boo-stop';
  stopButton.textContent = 'Stop';
  stopButton.style.cssText = 'flex:1;padding:8px;border:0;border-radius:6px;background:#5f6368;color:white;cursor:pointer';

  buttonRow.append(startButton, stopButton);
  panel.appendChild(buttonRow);

  const statusNode = document.createElement('div');
  statusNode.id = 'boo-status';
  statusNode.textContent = 'Ready. Open the Videos page in YouTube Studio.';
  statusNode.style.cssText = 'margin-bottom:6px';
  panel.appendChild(statusNode);

  const countsNode = document.createElement('div');
  countsNode.id = 'boo-counts';
  countsNode.textContent = 'Completed: 0 | Skipped/failed: 0';
  countsNode.style.cssText = 'color:#c7c7c7;margin-bottom:7px';
  panel.appendChild(countsNode);

  const logNode = document.createElement('div');
  logNode.id = 'boo-log';
  logNode.style.cssText = 'max-height:125px;overflow:auto;white-space:pre-wrap;color:#d7e3fc;border-top:1px solid #5f6368;padding-top:6px';
  panel.appendChild(logNode);

  // Small launcher stays visible; the full panel opens only on demand.
  const launcher = document.createElement('button');
  launcher.id = 'boo-draft-launcher';
  launcher.type = 'button';
  launcher.textContent = 'Draft helper';
  launcher.title = 'Open YouTube Draft helper';
  launcher.style.cssText = [
    'position:fixed', 'right:18px', 'bottom:18px', 'z-index:999999',
    'padding:8px 12px', 'border:1px solid #5f6368', 'border-radius:18px',
    'background:#202124', 'color:#fff', 'font:12px Arial,sans-serif',
    'box-shadow:0 2px 8px rgba(0,0,0,.25)', 'cursor:pointer'
  ].join(';');

  // Make the launcher and panel draggable. Positions are remembered on this browser.
  function makeDraggable(element, handle, storageKey, ignoreSelector = null) {
    let pointerStartX = 0;
    let pointerStartY = 0;
    let elementStartX = 0;
    let elementStartY = 0;
    let moved = false;
    let activePointer = null;

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
        element.style.left = `${saved.left}px`;
        element.style.top = `${saved.top}px`;
        element.style.right = 'auto';
        element.style.bottom = 'auto';
      }
    } catch (_) {}

    handle.style.cursor = 'move';
    handle.style.touchAction = 'none';
    handle.style.userSelect = 'none';

    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      if (ignoreSelector && event.target.closest(ignoreSelector)) return;

      const rect = element.getBoundingClientRect();
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      elementStartX = rect.left;
      elementStartY = rect.top;
      moved = false;
      activePointer = event.pointerId;

      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
    });

    handle.addEventListener('pointermove', event => {
      if (activePointer !== event.pointerId) return;

      const dx = event.clientX - pointerStartX;
      const dy = event.clientY - pointerStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;

      if (!moved) return;

      const maxLeft = Math.max(0, window.innerWidth - element.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - element.offsetHeight);
      const left = Math.min(maxLeft, Math.max(0, elementStartX + dx));
      const top = Math.min(maxTop, Math.max(0, elementStartY + dy));

      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    });

    const finishDrag = event => {
      if (activePointer !== event.pointerId) return;
      activePointer = null;

      if (moved) {
        const rect = element.getBoundingClientRect();
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            left: Math.round(rect.left),
            top: Math.round(rect.top)
          }));
        } catch (_) {}
        element.dataset.dragged = 'true';
      }
    };

    handle.addEventListener('pointerup', finishDrag);
    handle.addEventListener('pointercancel', finishDrag);
  }

  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  makeDraggable(launcher, launcher, 'booDraftLauncherPosition');
  makeDraggable(panel, headingRow, 'booDraftPanelPosition', 'button');

  launcher.addEventListener('click', event => {
    if (launcher.dataset.dragged === 'true') {
      delete launcher.dataset.dragged;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    panel.style.display = 'block';
    launcher.style.display = 'none';
  });
  closeButton.addEventListener('click', () => {
    panel.style.display = 'none';
    launcher.style.display = 'block';
  });

  const statusEl = panel.querySelector('#boo-status');
  const countsEl = panel.querySelector('#boo-counts');
  const logEl = panel.querySelector('#boo-log');

  function log(message) {
    const time = new Date().toLocaleTimeString();
    logEl.textContent = `[${time}] ${message}\n` + logEl.textContent;
    countsEl.textContent = `Completed: ${completed} | Skipped/failed: ${failed}`;
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const norm = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  function isVisible(el) {
    if (!el) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      rect.width > 0 && rect.height > 0;
  }

  function clickElement(el) {
    if (!el) return false;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    el.click();
    return true;
  }

  function activeDialog() {
    const candidates = [...document.querySelectorAll(
      '[role="dialog"], ytcp-uploads-dialog, ytcp-video-upload-dialog'
    )].filter(isVisible);
    return candidates[candidates.length - 1] || document;
  }

  function findTextElement(root, selectors, wantedText, exact = false) {
    const wanted = norm(wantedText);
    for (const selector of selectors) {
      const elements = [...root.querySelectorAll(selector)].filter(isVisible);
      const found = elements.find(el => {
        const text = norm(el.innerText || el.textContent);
        return exact ? text === wanted : text.includes(wanted);
      });
      if (found) return found;
    }
    return null;
  }

  function findButton(root, text) {
    const selectors = [
      'button', '[role="button"]', 'ytcp-button',
      'tp-yt-paper-button', 'yt-button-shape button'
    ];
    return findTextElement(root, selectors, text, true) ||
      findTextElement(root, selectors, text, false);
  }

  async function waitFor(test, description, timeout = STEP_TIMEOUT_MS) {
    const start = Date.now();
    while (running && Date.now() - start < timeout) {
      try {
        const result = test();
        if (result) return result;
      } catch (_) {}
      await sleep(CHECK_INTERVAL_MS);
    }
    if (!running) throw new Error('Stopped by user');
    throw new Error(`Timed out waiting for: ${description}`);
  }

  function getDraftRows() {
    const rows = [...document.querySelectorAll(
      'tr, [role="row"], ytcp-video-row, ytcp-video-list-cell'
    )].filter(isVisible);

    return rows.filter(row => {
      const text = norm(row.innerText || row.textContent);
      const hasDraft = /\bdraft\b/.test(text);
      const edit = [...row.querySelectorAll('button, [role="button"], ytcp-button, a')]
        .some(el => isVisible(el) && norm(el.innerText || el.textContent).includes('edit draft'));
      return hasDraft && edit;
    });
  }

  function rowTitle(row) {
    const titleEl = row.querySelector(
      '#video-title, [id*="video-title"], a[title], [aria-label*="video"]'
    );
    return (titleEl?.getAttribute('title') || titleEl?.innerText ||
      row.innerText || 'Untitled draft').split('\n')[0].trim();
  }

  async function openDraft(row) {
    const title = rowTitle(row);
    const editButton = [...row.querySelectorAll(
      'button, [role="button"], ytcp-button, a'
    )].find(el => isVisible(el) &&
      norm(el.innerText || el.textContent).includes('edit draft'));

    if (!editButton) throw new Error(`Could not find Edit draft for "${title}"`);
    clickElement(editButton);
    log(`Opened draft: ${title}`);
    return title;
  }

  function selectChoice(root, phrase) {
    const wanted = norm(phrase);
    const selectors = [
      'tp-yt-paper-radio-button',
      '[role="radio"]',
      'label',
      'ytcp-radio-button',
      'paper-radio-button'
    ];

    for (const selector of selectors) {
      const candidates = [...root.querySelectorAll(selector)].filter(isVisible);
      const choice = candidates.find(el =>
        norm(el.innerText || el.textContent).includes(wanted)
      );
      if (choice) {
        clickElement(choice);
        return true;
      }
    }

    // Fallback: click the visible text node's nearest clickable container.
    const all = [...root.querySelectorAll('*')].filter(isVisible);
    const textEl = all.find(el => {
      const t = norm(el.innerText || el.textContent);
      return t === wanted || (t.includes(wanted) && el.children.length === 0);
    });
    if (textEl) {
      clickElement(textEl.closest(
        'tp-yt-paper-radio-button, [role="radio"], label, ytcp-radio-button'
      ) || textEl);
      return true;
    }
    return false;
  }

  async function clickNext(rootDescription) {
    const root = activeDialog();
    const button = await waitFor(() => {
      const r = activeDialog();
      const b = findButton(r, 'Next');
      return b && !b.hasAttribute('disabled') &&
        b.getAttribute('aria-disabled') !== 'true' ? b : null;
    }, `Next button (${rootDescription})`);
    clickElement(button);
    log(`Clicked Next: ${rootDescription}`);
    await sleep(900);
  }

  async function completeDraft(title) {
    // Details: choose "No, it's not made for kids".
    let root = activeDialog();
    await waitFor(() => {
      const r = activeDialog();
      const t = norm(r.innerText || r.textContent);
      return t.includes("yes, it's made for kids") &&
             t.includes("no, it's not made for kids");
    }, 'Details page');

    root = activeDialog();
    if (!selectChoice(root, "No, it's not made for kids")) {
      throw new Error('Could not select "No, it\'s not made for kids"');
    }
    log('Selected: Not made for kids');
    await clickNext('Details');

    // Video elements page.
    await waitFor(() => {
      const t = norm(activeDialog().innerText || activeDialog().textContent);
      return t.includes('video elements');
    }, 'Video elements page');
    await clickNext('Video elements');

    // Initial check page.
    await waitFor(() => {
      const t = norm(activeDialog().innerText || activeDialog().textContent);
      return t.includes('initial check');
    }, 'Initial check page');
    await clickNext('Initial check');

    // Visibility page: choose Private, then Save.
    await waitFor(() => {
      const t = norm(activeDialog().innerText || activeDialog().textContent);
      return t.includes('visibility') && t.includes('private') && t.includes('unlisted');
    }, 'Visibility page');

    root = activeDialog();
    if (!selectChoice(root, 'Private')) {
      throw new Error('Could not select Private visibility');
    }
    log('Selected visibility: Private');

    const saveButton = await waitFor(() => {
      const r = activeDialog();
      const b = findButton(r, 'Save');
      return b && !b.hasAttribute('disabled') &&
        b.getAttribute('aria-disabled') !== 'true' ? b : null;
    }, 'Save button');

    clickElement(saveButton);
    log(`Clicked Save: ${title}`);

    // Wait for the editor to close before moving to the next draft.
    await waitFor(() => {
      const dialogs = [...document.querySelectorAll(
        '[role="dialog"], ytcp-uploads-dialog, ytcp-video-upload-dialog'
      )].filter(isVisible);
      return dialogs.length === 0;
    }, 'editor to close', 60000);

    completed++;
    countsEl.textContent = `Completed: ${completed} | Skipped/failed: ${failed}`;
    log(`Finished: ${title}`);
    await sleep(BETWEEN_VIDEOS_MS);
  }

  async function processDrafts() {
    if (busy) return;
    busy = true;
    try {
      while (running) {
        setStatus('Looking for draft videos…');
        await sleep(500);

        const rows = getDraftRows();
        const nextRow = rows.find(row => !processed.has(rowTitle(row)));

        if (!nextRow) {
          setStatus('No more unprocessed drafts found.');
          log('Finished scanning. No more Draft videos found.');
          running = false;
          break;
        }

        let title = rowTitle(nextRow);
        processed.add(title);

        try {
          setStatus(`Processing: ${title}`);
          title = await openDraft(nextRow);
          await completeDraft(title);
        } catch (error) {
          failed++;
          countsEl.textContent = `Completed: ${completed} | Skipped/failed: ${failed}`;
          log(`Stopped on "${title}": ${error.message}`);
          setStatus(`Stopped: ${error.message}`);
          running = false;
          break;
        }
      }
    } finally {
      busy = false;
      if (!running && !statusEl.textContent.startsWith('Stopped')) {
        panel.querySelector('#boo-start').disabled = false;
      }
    }
  }

  panel.querySelector('#boo-start').addEventListener('click', () => {
    if (running || busy) return;
    if (!confirm(
      'This will process Draft videos, set "Not made for kids", and save them as Private. Continue?'
    )) return;
    running = true;
    panel.querySelector('#boo-start').disabled = true;
    setStatus('Starting…');
    log('Started.');
    processDrafts();
  });

  panel.querySelector('#boo-stop').addEventListener('click', () => {
    running = false;
    setStatus('Stop requested. The current step will finish or time out.');
    log('Stop requested.');
    panel.querySelector('#boo-start').disabled = false;
  });

  log('Ready. Click the small Draft helper launcher whenever you want to open the controls.');
})();
