# UAT — Client Survey Submission (OCSM)

> **Purpose:** verify that a client can complete and submit the Client Satisfaction
> Survey, and that a failed submission now tells the client what happened and lets
> them retry without losing their answers.
>
> **Raised by:** reports that clients could not submit their feedback.
> **Covers:** `front-end/src/page_survey/` (Survey, SQDTable) and `front-end/src/services/api.js`.

---

## 1. Why this round of testing exists

Before this change, the submit path could fail **silently**:

| Defect | What the client saw |
|---|---|
| No request timeout on the API client | Tapped **Submit**, nothing happened — no spinner, no error, forever |
| No submitting state | Repeated taps could post the survey more than once |
| Summary builder could throw before the confirm dialog opened | Tapped **Submit**, nothing happened at all |
| A failed submit had no retry | Error popup, then a dead end |
| `Form.useWatch` called after an early return in `SQDTable` | Rating step could tear down mid-survey |

The fixes add a 30-second request timeout, a blocking progress dialog, a
double-submit guard, plain-language error messages, and a **Try Again** button that
keeps every answer. Sections 4 and 5 below are the new behaviour — test those
carefully, because they are the ones that have never been exercised in production.

---

## 2. Before you start

| Item | Value |
|---|---|
| Survey (external) | `https://embr3-onlinesystems.cloud/ocsm/survey/page1?lang=en&type=external` |
| Survey (internal) | `https://embr3-onlinesystems.cloud/ocsm/survey/page1?lang=en&type=internal` |
| Client landing | `https://embr3-onlinesystems.cloud/ocsm/client` |
| Admin (to confirm records) | `https://embr3-onlinesystems.cloud/ocsm/admin` → **Measurement** |
| Health check | `https://embr3-onlinesystems.cloud/ocsm/api/health` → `{"status":"ok"}` |

**Checklist before the first test**

- [ ] The new build is deployed (see `docs/VPS_QUICK_DEPLOY.md`).
- [ ] Hard-refresh the browser (`Ctrl+Shift+R`) so you are not testing the old bundle.
- [ ] Open DevTools (`F12`) → **Console** and **Network** tabs, and leave them open.
- [ ] Open the admin **Measurement** page in a second tab and **write down the current
      total number of submissions.** Several tests depend on that number.
- [ ] Test on at least one desktop browser **and** one phone or tablet — clients use both.

**Recording results:** mark each case Pass / Fail. For any Fail, capture a screenshot
of the screen *and* of the DevTools Console, and note the exact time (submissions are
timestamped, which makes them easy to find afterwards).

---

## 3. Happy path

### UAT-01 — Complete an external survey end to end

1. Open the external survey URL.
2. **Step 1 (Primary Information):** choose Customer type `Citizen`, enter Age `30`,
   choose a Gender, pick at least one **Service Availed**. Leave Region and Agency as
   pre-filled. Tap **Next**.
3. **Step 2 (Citizens Charter):** answer all three CC questions. Tap **Next**.
4. **Step 3 (SQD):** rate every item on each of the three rating pages, tapping
   **Next** between them. Type a sentence in Remarks on the last page.
5. Tap **Submit Survey**.
6. In the confirmation summary, review the answers and tap the confirm button.

**Expected**

- The summary lists your answers under Personal Info, Citizens Charter, SQD and Remarks.
- A **"Submitting your feedback…"** dialog with a spinner appears. It cannot be
  dismissed by clicking outside it or pressing `Esc`.
- A success/thank-you dialog follows, then the agency contact dialog.
- Closing the last dialog returns you to the client page.
- Admin **Measurement** total increased by **exactly 1**; the new record shows your
  answers with readable labels (Region, Customer Type, Service Availed, the CC and
  SQD questions, Remarks).
- Console shows no red errors.

### UAT-02 — Internal survey

Repeat UAT-01 using the **internal** URL.

**Expected:** the "Internal Survey — EMB Region III Employee" badge is shown; Customer
type is locked to `Government` and Agency Name pre-filled to `EMB Region III`; an
optional Employee Name field appears; the Service Availed list shows internal services.
The record saves with `surveyType: internal`.

### UAT-03 — Filipino language

Run UAT-01 again, switching to 🇵🇭 Filipino using the floating language button.

**Expected:** questions, options, buttons and all dialogs — including the new
submitting and error dialogs — appear in Filipino. The submission saves normally.

### UAT-04 — Phone / tablet

Run UAT-01 on a phone or tablet in portrait.

**Expected:** no horizontal scrolling; rating icons are tappable; the summary dialog
is scrollable and readable; submission succeeds.

---

## 4. New: progress, duplicates and recovery

> These are the fixes for the reported problem. **Do not skip them.**

### UAT-05 — Progress dialog is shown while submitting

Reach the confirm step, then in DevTools **Network** set throttling to **Slow 3G**.
Confirm the submission.

**Expected:** the "Submitting your feedback…" dialog stays visible for the whole
request. The client is never left looking at a screen where nothing is happening.
It is replaced by the thank-you dialog once the server responds.

### UAT-06 — Double tap does not create two records

Note the submission total. Reach the confirm step with **Slow 3G** throttling on.
Tap the confirm button, then immediately try to tap **Submit Survey** underneath and
tap the confirm button again several times.

**Expected:** the **Submit Survey** button is disabled and shows a spinner while the
submit is in flight. The submission total increases by **exactly 1** — not 2 or more.

### UAT-07 — No network: clear message, answers kept

Note the submission total. Fill the survey to the confirm step. Set DevTools
**Network** to **Offline** (or switch the tablet to airplane mode). Confirm the
submission.

**Expected**

- Within ~30 seconds an error dialog appears reading **"We could not reach the server.
  Check your internet connection and try again."** — not a blank message, not
  "undefined", and not an endless spinner.
- The dialog offers **Try Again** and **Cancel**.
- Submission total is **unchanged**.

### UAT-08 — Try Again succeeds after reconnecting

Continue directly from UAT-07. Restore the network (set Network back to **No
throttling** / turn airplane mode off), then tap **Try Again**.

**Expected:** the submitting dialog reappears, the submission succeeds, and the
thank-you flow runs. **All answers from before the failure are present in the saved
record** — nothing was re-typed. Total increases by exactly 1.

### UAT-09 — Cancel returns to the survey with answers intact

Note the total. Reach the confirm step, go **Offline**, confirm, and when the error
dialog appears tap **Cancel**.

**Expected:** you are returned to the survey on the last step with every answer still
filled in. Restore the network, tap **Submit Survey** again, confirm — it now succeeds.
Total increases by exactly 1 across the whole test.

### UAT-10 — Stalled request times out

Note the total. In DevTools **Network**, add a request-blocking pattern for
`*/api/client-satisfactory/submit` (Network → right-click → *Block request URL*), then
confirm a submission.

**Expected:** the request does not hang indefinitely. Within roughly 30 seconds the
"could not reach the server" dialog appears with **Try Again**. Remove the block, tap
**Try Again** — it succeeds. Total increases by exactly 1.

---

## 5. Validation guards (regression)

### UAT-11 — Step 1 cannot be skipped

On a fresh survey, tap **Next** without answering.

**Expected:** **Next** is disabled until Customer type and at least one Service
Availed are chosen. With `Citizen` selected, Gender is also required. With `Business`,
Company Name is required. With `Government`, Agency Name is required. A short hint
explains what is missing.

### UAT-12 — Citizens Charter needs at least one answer

On step 2, tap **Next** with nothing answered.

**Expected:** **Next** is disabled with a hint that at least one question must be
answered. Answering any one of the three enables it.

### UAT-13 — Every SQD item on a page must be rated

On step 3, rate only some items on a page and tap **Next**.

**Expected:** **Next** stays disabled and the hint shows how many items remain.
Rating the rest enables it. "Not Applicable" counts as a rating.

### UAT-14 — Back preserves answers

From step 3, tap **Back** to step 2 and step 1, then forward again.

**Expected:** all previously entered answers are still there; nothing is cleared.
Moving between the three SQD rating pages also preserves ratings.

### UAT-15 — Quit asks for confirmation

Mid-survey, tap the red **Quit** button.

**Expected:** a confirmation dialog warns that progress will not be saved. **Stay**
keeps you on the survey with answers intact; **Quit Survey** returns to the client page
and records nothing.

### UAT-16 — Survey loads on a direct link and on refresh

Open the survey URL directly in a new tab, and press `F5` mid-survey.

**Expected:** the page loads (no 404, no blank screen) and questions appear. After a
refresh the survey restarts empty — that is expected behaviour.

---

## 6. Sign-off

| Case | Title | Result | Tester | Notes |
|---|---|---|---|---|
| UAT-01 | External survey end to end | | | |
| UAT-02 | Internal survey | | | |
| UAT-03 | Filipino language | | | |
| UAT-04 | Phone / tablet | | | |
| UAT-05 | Progress dialog shown | | | |
| UAT-06 | Double tap → one record | | | |
| UAT-07 | No network → clear message | | | |
| UAT-08 | Try Again succeeds | | | |
| UAT-09 | Cancel keeps answers | | | |
| UAT-10 | Stalled request times out | | | |
| UAT-11 | Step 1 validation | | | |
| UAT-12 | CC at-least-one rule | | | |
| UAT-13 | SQD complete-page rule | | | |
| UAT-14 | Back preserves answers | | | |
| UAT-15 | Quit confirmation | | | |
| UAT-16 | Direct link and refresh | | | |

**Exit criteria:** UAT-01 and UAT-05 through UAT-10 must all pass. These are the
submission path and its recovery behaviour — a failure in any of them means clients can
still be blocked.

Tested build / commit: `____________________`
Tested on (date): `____________________`
Approved by: `____________________`

---

## 7. If a test fails

1. Screenshot the screen and the DevTools **Console**, and note the time.
2. In DevTools **Network**, find the `submit` request and record its **status code**
   and response body.
3. On the VPS, check the backend log around that time:
   ```bash
   journalctl -u embr3-server -n 100 --no-pager
   ```
4. Errors are also recorded in the app itself: admin → **Logs** (every 4xx/5xx API
   response is logged with its path, status and duration).

**Reading the status code**

| Status | Meaning |
|---|---|
| `201` | Saved. If the UI still showed an error, the problem is in the front end. |
| `400` | The payload was missing `answers` or `deviceId`. |
| `429` | Rate limit hit (300 requests / 15 min per IP). Expect the "too many requests" message. |
| `500` | The server failed to save — check `journalctl`. |
| `502` / `504` | Backend down or not responding; check `systemctl status embr3-server`. |
| No response | Network, DNS or nginx. Confirm `/ocsm/api/health` responds. |

A test submission cannot be deleted from the admin UI. Note the timestamps of records
you create during UAT so they can be removed from MongoDB Atlas afterwards if the data
needs to stay clean.
