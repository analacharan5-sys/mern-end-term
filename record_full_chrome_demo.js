const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Human-like Bézier curve mouse movement with organic jitter
async function humanMouseMove(page, targetX, targetY, durationSteps = 35) {
  const currentPos = await page.evaluate(() => window._currentMousePos || { x: 640, y: 360 });
  const startX = currentPos.x;
  const startY = currentPos.y;

  const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 80;
  const midY = (startY + targetY) / 2 + (Math.random() - 0.5) * 60;

  for (let i = 1; i <= durationSteps; i++) {
    const t = i / durationSteps;
    const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const currentX = Math.round((1 - easeT) * (1 - easeT) * startX + 2 * (1 - easeT) * easeT * midX + easeT * easeT * targetX);
    const currentY = Math.round((1 - easeT) * (1 - easeT) * startY + 2 * (1 - easeT) * easeT * midY + easeT * easeT * targetY);

    await page.mouse.move(currentX, currentY);
    await page.evaluate(({ x, y }) => {
      window._currentMousePos = { x, y };
      const cur = document.getElementById('human-mouse-cursor');
      if (cur) {
        cur.style.left = x + 'px';
        cur.style.top = y + 'px';
      }
    }, { x: currentX, y: currentY });

    await page.waitForTimeout(14);
  }

  await page.mouse.move(targetX, targetY);
}

// Human-like click with realistic click ripple
async function humanClick(page, selector, pauseAfter = 1800) {
  const el = await page.waitForSelector(selector, { state: 'visible', timeout: 15000 });
  const box = await el.boundingBox();
  if (!box) return;

  const targetX = box.x + box.width / 2 + (Math.random() - 0.5) * (box.width * 0.3);
  const targetY = box.y + box.height / 2 + (Math.random() - 0.5) * (box.height * 0.3);

  await humanMouseMove(page, targetX, targetY, 28 + Math.floor(Math.random() * 12));
  await page.waitForTimeout(250 + Math.floor(Math.random() * 120));

  await page.evaluate(({ x, y }) => {
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(11, 87, 208, 0.4);
      transform: translate(-50%, -50%) scale(0.5);
      pointer-events: none;
      z-index: 2147483647;
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
    `;
    document.body.appendChild(ripple);
    requestAnimationFrame(() => {
      ripple.style.transform = 'translate(-50%, -50%) scale(1.6)';
      ripple.style.opacity = '0';
    });
    setTimeout(() => ripple.remove(), 400);
  }, { x: targetX, y: targetY });

  await page.mouse.down();
  await page.waitForTimeout(90 + Math.floor(Math.random() * 40));
  await page.mouse.up();

  if (pauseAfter > 0) {
    await page.waitForTimeout(pauseAfter);
  }
}

// Human-like typing with variable keystroke delays
async function humanType(page, selector, text, pauseAfter = 1400) {
  await humanClick(page, selector, 300);
  await page.fill(selector, '');
  for (const char of text) {
    await page.keyboard.type(char, { delay: 65 + Math.floor(Math.random() * 55) });
    if (Math.random() < 0.08) {
      await page.waitForTimeout(180 + Math.floor(Math.random() * 150));
    }
  }
  if (pauseAfter > 0) {
    await page.waitForTimeout(pauseAfter);
  }
}

// Human-like smooth wheel scroll
async function humanScroll(page, deltaY, steps = 15, pauseAfter = 1500) {
  const stepDelta = deltaY / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepDelta);
    await page.waitForTimeout(50);
  }
  if (pauseAfter > 0) {
    await page.waitForTimeout(pauseAfter);
  }
}

// Injects the clean Chrome window header matching the user's screenshot (NO blinking caret line)
async function injectExactChromeHeader(page, currentPath = '') {
  await page.evaluate(({ path }) => {
    let header = document.getElementById('chrome-exact-header');
    if (!header) {
      header = document.createElement('div');
      header.id = 'chrome-exact-header';
      header.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 84px;
        z-index: 2147483640;
        background: #dfe5f8;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        user-select: none;
        display: flex;
        flex-direction: column;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      `;

      header.innerHTML = `
        <!-- Top Tab Strip -->
        <div style="height: 42px; display: flex; align-items: flex-end; padding: 0 8px 0 10px; justify-content: space-between;">
          <!-- Left: Tab Search & Tab -->
          <div style="display: flex; align-items: flex-end; height: 100%; gap: 6px;">
            <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: #444746; margin-bottom: 3px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>

            <!-- Active QueueLess Tab -->
            <div style="
              background: #ffffff;
              height: 34px;
              padding: 0 12px;
              border-radius: 10px 10px 0 0;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 12px;
              color: #1f1f1f;
              width: 230px;
              box-shadow: 0 0 2px rgba(0,0,0,0.06);
            ">
              <svg style="width: 15px; height: 15px; color: #4f46e5; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; font-size: 12px;">QueueLess - Campus Appointm...</span>
              <span style="margin-left: auto; color: #5f6368; font-size: 15px; font-weight: 400; line-height: 1;">&times;</span>
            </div>

            <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: #444746; margin-bottom: 3px; font-size: 18px;">
              +
            </div>
          </div>

          <!-- Right: Ask Gemini & Windows Controls -->
          <div style="display: flex; align-items: center; height: 100%; gap: 10px;">
            <!-- Ask Gemini Pill -->
            <div style="
              background: #ffffff;
              border-radius: 16px;
              padding: 3px 10px 3px 8px;
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 11.5px;
              font-weight: 500;
              color: #1f1f1f;
              box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#gemini-grad-clean)"/>
                <defs>
                  <linearGradient id="gemini-grad-clean" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#4285F4"/>
                    <stop offset="0.5" stop-color="#9B72CB"/>
                    <stop offset="1" stop-color="#D96570"/>
                  </linearGradient>
                </defs>
              </svg>
              <span>Ask Gemini</span>
            </div>

            <div style="width: 1px; height: 16px; background: #c4c7c5;"></div>

            <!-- Windows 11 Controls -->
            <div style="display: flex; align-items: center;">
              <div style="width: 44px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #444746;">&#9472;</div>
              <div style="width: 44px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #444746;">&#9633;</div>
              <div style="width: 44px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #444746;">&#10005;</div>
            </div>
          </div>
        </div>

        <!-- Toolbar / Omnibox Row -->
        <div style="
          height: 42px;
          background: #ffffff;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 10px;
          border-bottom: 1px solid #e0e3e7;
        ">
          <!-- Navigation Buttons -->
          <div style="display: flex; align-items: center; gap: 4px; color: #5f6368;">
            <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </div>
            <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; opacity: 0.4;">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
            <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </div>
          </div>

          <!-- Omnibox (NO BLINKING LINE - Completely Clean) -->
          <div style="
            flex: 1;
            height: 32px;
            background: #ffffff;
            border: 2px solid #0b57d0;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            padding: 0 12px;
            gap: 8px;
            font-size: 13.5px;
            box-shadow: 0 1px 3px rgba(11,87,208,0.15);
          ">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#444746" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>

            <!-- URL Text: NO blinking caret -->
            <div style="color: #1f1f1f; font-family: 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; font-size: 13px;">
              <span style="font-weight: 500; color: #1f1f1f;">localhost:5000</span><span id="omnibox-path" style="color: #444746;">${path}</span>
            </div>

            <div style="margin-left: auto; color: #444746;">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
          </div>

          <!-- Right Toolbar: Extension, Side Panel, School Avatar, 3-dots -->
          <div style="display: flex; align-items: center; gap: 8px; color: #444746;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="url(#c-grad-clean)" stroke-width="3"/>
              <defs>
                <linearGradient id="c-grad-clean" x1="0" y1="0" x2="24" y2="24">
                  <stop stop-color="#EA4335"/>
                  <stop offset="0.33" stop-color="#FBBC05"/>
                  <stop offset="0.66" stop-color="#34A853"/>
                  <stop offset="1" stop-color="#4285F4"/>
                </linearGradient>
              </defs>
            </svg>

            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>

            <div style="width: 1px; height: 16px; background: #e0e3e7; margin: 0 2px;"></div>

            <!-- School Profile Avatar Pill -->
            <div style="display: flex; align-items: center; gap: 6px; padding: 2px 6px; border-radius: 14px;">
              <div style="width: 24px; height: 24px; border-radius: 50%; background: #2e7d32; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">
                S
              </div>
              <span style="font-size: 12px; font-weight: 500; color: #1f1f1f;">School</span>
            </div>

            <div style="width: 24px; height: 28px; display: flex; align-items: center; justify-content: center; color: #444746;">
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </div>
          </div>
        </div>
      `;

      document.body.prepend(header);
      document.body.style.paddingTop = '84px';
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        navbar.style.top = '84px';
      }
    } else {
      const pathEl = document.getElementById('omnibox-path');
      if (pathEl) pathEl.textContent = path;
    }

    // Windows Cursor
    let cursor = document.getElementById('human-mouse-cursor');
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = 'human-mouse-cursor';
      cursor.style.cssText = `
        position: fixed;
        left: 640px;
        top: 360px;
        width: 24px;
        height: 24px;
        z-index: 2147483647;
        pointer-events: none;
        transform: translate(0, 0);
      `;
      cursor.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5.5 3.2L18.5 13.5L12.5 14.5L16.2 21.8L13.8 23L10.1 15.7L5.5 19.5V3.2Z" fill="white" stroke="#1f2937" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>
      `;
      document.body.appendChild(cursor);
    }
  }, { path: currentPath });
}

async function recordRealisticDemo() {
  const outputDir = path.resolve(__dirname, 'demo_recording_output_clean');
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('[Recorder] Launching Chrome in HD (1280x720)...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,720']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  console.log('[Recorder] Loading http://localhost:5000/...');
  await page.goto('http://localhost:5000', { waitUntil: 'networkidle' });
  await injectExactChromeHeader(page, '');
  // Pause so initial frames are completely rendered
  await page.waitForTimeout(3000);

  const startTime = Date.now();

  // -------------------------------------------------------------
  // PHASE 1: Explore Directory & Campus Services (0:00 - 0:40)
  // -------------------------------------------------------------
  console.log('[Recorder] Phase 1: Exploring Campus Directory...');
  await humanMouseMove(page, 450, 60, 30);
  await page.waitForTimeout(2000);

  await humanMouseMove(page, 640, 200, 35);
  await page.waitForTimeout(2200);

  // Click category pills
  await humanClick(page, 'button:has-text("Academic Advising")', 2800);
  await humanClick(page, 'button:has-text("Financial Aid")', 2800);
  await humanClick(page, 'button:has-text("Campus Health")', 2800);
  await humanClick(page, 'button:has-text("All")', 2200);

  // Search input typing test
  await humanType(page, 'input[placeholder="Search services..."]', 'Advising', 2500);
  await humanClick(page, 'input[placeholder="Search services..."]', 800);
  await page.fill('input[placeholder="Search services..."]', '');
  await page.waitForTimeout(1800);

  // Scroll down to examine cards
  await humanScroll(page, 220, 18, 2500);
  await humanMouseMove(page, 220, 480, 25);
  await page.waitForTimeout(1800);
  await humanMouseMove(page, 550, 480, 25);
  await page.waitForTimeout(1800);
  await humanScroll(page, -220, 18, 2000);

  // -------------------------------------------------------------
  // PHASE 2: Student Login (0:40 - 1:15)
  // -------------------------------------------------------------
  console.log('[Recorder] Phase 2: Student Login...');
  await humanClick(page, 'button:has-text("Log In")', 2200);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(2000);

  await humanMouseMove(page, 550, 500, 25);
  await page.waitForTimeout(1400);

  await humanClick(page, 'button:has-text("Student Demo")', 1800);

  await humanMouseMove(page, 640, 420, 25);
  await page.waitForTimeout(1400);
  await humanClick(page, 'button[type="submit"]:has-text("Sign In")', 3000);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(2500);

  // -------------------------------------------------------------
  // PHASE 3: Slot Discovery & Booking (1:15 - 1:55)
  // -------------------------------------------------------------
  console.log('[Recorder] Phase 3: Booking Academic Advising Slot...');
  await humanClick(page, 'button:has-text("View Available Slots")', 2500);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(2500);

  await humanClick(page, 'button:has-text("Tomorrow")', 2400);
  await humanClick(page, 'button:has-text("Today")', 2400);

  await humanScroll(page, 200, 15, 2000);

  await humanMouseMove(page, 400, 420, 25);
  await page.waitForTimeout(2000);

  await humanClick(page, 'button:has-text("Reserve Spot")', 2500);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(2000);

  await humanType(page, 'textarea.form-textarea', 'Review graduation audit, sign off on course prerequisites, and check degree plan.', 2200);

  await humanClick(page, 'button[type="submit"]:has-text("Confirm Booking")', 3500);
  await injectExactChromeHeader(page, '');

  // Pause on Confirmation Dialog to clearly show Ticket #1
  await humanMouseMove(page, 640, 340, 25);
  await page.waitForTimeout(4500);

  await humanClick(page, 'button:has-text("Go to My Appointments")', 2800);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(2500);

  // -------------------------------------------------------------
  // PHASE 4: My Appointments & Live Queue Tracker (1:55 - 2:35)
  // -------------------------------------------------------------
  console.log('[Recorder] Phase 4: My Appointments & Check-In...');
  await humanMouseMove(page, 640, 320, 25);
  await page.waitForTimeout(2200);

  const checkInBtn = await page.$('button:has-text("Check In Now")');
  if (checkInBtn) {
    await humanClick(page, 'button:has-text("Check In Now")', 2800);
    await injectExactChromeHeader(page, '');
    await page.waitForTimeout(2200);
  }

  await humanClick(page, 'button:has-text("Track Live Queue")', 2800);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(2200);

  await humanMouseMove(page, 640, 360, 25);
  await page.waitForTimeout(4000);

  // -------------------------------------------------------------
  // PHASE 5: Admin Switch & Service Desk (2:35 - 3:20)
  // -------------------------------------------------------------
  console.log('[Recorder] Phase 5: Administrator Operations Desk...');
  await humanClick(page, 'button:has-text("Logout")', 2200);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(1600);

  await humanClick(page, 'button:has-text("Log In")', 1800);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(1600);

  await humanClick(page, 'button:has-text("Admin Demo")', 1500);
  await humanClick(page, 'button[type="submit"]:has-text("Sign In")', 3000);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(2500);

  await humanClick(page, 'button:has-text("Desk Bookings")', 2800);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(2500);

  const completeBtn = await page.$('button.btn-success:has-text("Complete")');
  if (completeBtn) {
    await humanClick(page, 'button.btn-success:has-text("Complete")', 2000);
    await injectExactChromeHeader(page, '');
    await page.waitForTimeout(1600);

    await humanType(page, 'textarea#completionNotes', 'Graduation audit completed. All Computer Science electives approved and verified.', 2200);
    await humanClick(page, 'button.btn-success:has-text("Mark Completed")', 3000);
    await injectExactChromeHeader(page, '');
    await page.waitForTimeout(2500);
  }

  // -------------------------------------------------------------
  // PHASE 6: Bulk Slot Generator (3:20 - 3:55)
  // -------------------------------------------------------------
  console.log('[Recorder] Phase 6: Bulk Slot Generator...');
  await humanClick(page, 'button:has-text("Slots (Admin)")', 2800);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(2500);

  await humanScroll(page, 320, 18, 2000);
  await humanMouseMove(page, 400, 360, 25);
  await page.waitForTimeout(1600);

  const genBtn = await page.$('button:has-text("Generate Consecutive Slots")');
  if (genBtn) {
    await humanClick(page, 'button:has-text("Generate Consecutive Slots")', 2800);
    await injectExactChromeHeader(page, '');
    await page.waitForTimeout(2500);
  }

  // -------------------------------------------------------------
  // PHASE 7: Capacity Utilization Analytics (3:55 - 4:30+)
  // -------------------------------------------------------------
  console.log('[Recorder] Phase 7: Capacity Utilization Analytics...');
  await humanClick(page, 'button:has-text("Stats & Utilization")', 2800);
  await injectExactChromeHeader(page, '');
  await page.waitForTimeout(2500);

  // Hover over KPI metric cards
  await humanMouseMove(page, 260, 280, 25);
  await page.waitForTimeout(2000);
  await humanMouseMove(page, 500, 280, 25);
  await page.waitForTimeout(2000);
  await humanMouseMove(page, 740, 280, 25);
  await page.waitForTimeout(2000);
  await humanMouseMove(page, 980, 280, 25);
  await page.waitForTimeout(2200);

  // Scroll down to breakdown table
  await humanScroll(page, 320, 20, 2500);
  await humanMouseMove(page, 640, 480, 25);
  await page.waitForTimeout(3500);

  // Scroll back to top
  await humanScroll(page, -320, 20, 2000);

  // Ensure total video length is comfortably over 3 minutes (195+ seconds)
  const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
  console.log(`[Recorder] Current elapsed time: ${elapsedSeconds} seconds.`);
  if (elapsedSeconds < 195) {
    const remainingSeconds = 195 - elapsedSeconds;
    console.log(`[Recorder] Adding ${remainingSeconds}s final human inspection to guarantee >3 mins total length...`);
    await humanMouseMove(page, 500, 280, 30);
    await page.waitForTimeout(remainingSeconds * 1000);
  }

  const finalDuration = Math.round((Date.now() - startTime) / 1000);
  console.log(`[Recorder] Final active duration: ${finalDuration}s (${Math.floor(finalDuration/60)}m ${finalDuration%60}s)`);

  // To prevent any black screen at the end, DO NOT call page.close() before context.close()!
  // Instead, close context directly while the page is still fully rendered!
  await context.close();
  await browser.close();

  // Find generated .webm
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    throw new Error('No webm video found in output directory.');
  }

  const rawWebm = path.join(outputDir, files[files.length - 1]);
  const finalWebm = path.resolve(__dirname, 'QueueLess_Demo_Video.webm');
  const ffmpegPath = 'C:\\Users\\Anala Charan\\AppData\\Local\\ms-playwright\\ffmpeg-1013\\ffmpeg-win64.exe';

  // Trim the first 1.2 seconds of initial blank connection frames using lossless ffmpeg
  if (fs.existsSync(ffmpegPath)) {
    console.log('[Recorder] Losslessly trimming initial blank frame with FFmpeg (-ss 00:00:01.2)...');
    try {
      execSync(`"${ffmpegPath}" -y -ss 00:00:01.2 -i "${rawWebm}" -c copy "${finalWebm}"`, { stdio: 'inherit' });
      console.log(`[Recorder] Successfully trimmed to seamless video: ${finalWebm}`);
    } catch (err) {
      console.warn('[Recorder Warning] Trimming failed, copying raw:', err.message);
      fs.copyFileSync(rawWebm, finalWebm);
    }
  } else {
    fs.copyFileSync(rawWebm, finalWebm);
  }

  // Also copy to frontend/dist so it is immediately downloadable from http://localhost:5000/QueueLess_Demo_Video.webm
  const distDir = path.resolve(__dirname, 'frontend/dist');
  if (fs.existsSync(distDir)) {
    const distVideo = path.join(distDir, 'QueueLess_Demo_Video.webm');
    fs.copyFileSync(finalWebm, distVideo);
    console.log(`[Recorder] Copied to public download server: ${distVideo}`);
  }

  console.log('====================================================');
  console.log(`  PERFECT CHROME DEMO VIDEO CREATED!`);
  console.log(`  File: ${finalWebm}`);
  console.log(`  Download URL: http://localhost:5000/QueueLess_Demo_Video.webm`);
  console.log('====================================================');
}

recordRealisticDemo().catch(err => {
  console.error('[Recorder Error]', err);
  process.exit(1);
});
