# Classroom dashboard setup

The new page is `Classroom_Dashboard.html`. It is independent of the current Apps Script dashboard. No existing GCI page is replaced.

## What is ready

- Daily Starter, Focus, Brain Break, and Exit Ticket content tabs. Focus replaces the main activity rather than adding another permanent panel. It shows one task and up to three steps in large text for the classroom TVs. Success criteria, Hint, and Help buttons temporarily replace that view; Back to task restores it.
- Compact desktop header with date and controls on one line, smaller phase strip and tabs, and a slim learning-target strip above the activity. The target stays visible across activity tabs and follows the selected date. Outside class hours, automatic content defaults to Intro; unavailable targets show an explicit message rather than hiding the strip.
- A Timer button opens a movable countdown window with 1/3/5/10-minute presets, a custom 1–180-minute duration, Start/Pause/Resume, Reset, +30 sec, and +1 min. Drag its title or use arrow keys when the title is focused; Center restores its position. Closing it keeps the countdown running; the window reopens once when time is up. It runs independently of scheduled class phases and leaves the dashboard usable while open.
- Previous/Next day, Today, and a date picker. The complete selected date (weekday, month, day, and year) appears at the top right. Activities and deadlines follow the selected date/week; the clock, phase timing, and announcements follow today’s actual class calendar. Navigation includes weekends and inactive dates, which show an empty scheduled-activity message.
- Compact class progress and countdown: Daily Starter → Focus → Brain Break → Focus → Cleanup.
- A six-second visual announcement when a phase starts, optional chime, manual phase selection, repeat announcement, and return to scheduled timing.
- Due This Week shows only the session currently meeting and its careers course: Career Essentials for 1st/2nd Session or Career Exploration for 3rd Session. Both start expanded. Between sessions and on no-class days, the sidebar is hidden and the activity fills the width. Visibility follows the actual schedule, independently of viewed dates or manual phase overrides.
- Instructor → **Expand all sessions** shows and opens all five course sections, including both careers courses, even outside class hours. **Current session** returns to the compact automatic view. The all-courses override lasts until you change it or reload the page.
- School notices appear below assignments in the right column, using the same `School_Calendar_Master` spreadsheet as `No_School_Viewer.html`. No-school/no-student notices list affected schools directly. Half days, virtual days, and other events start collapsed under Other notices. A Full calendar link opens the existing viewer. Notices remain available outside class hours even when the assignment panel hides. GCI/full-school closures pause activities and timing; feeder-school notices, half days, and virtual days do not automatically cancel GCI class.
- Only days with assignments due are listed, including weekend deadlines. Courses with no deadlines show one “Nothing due this week” message. Times use America/Detroit, including daylight saving changes. Earlier days are muted and today is highlighted.
- Each assignment shows aggregate progress, such as **18 / 24 submitted**, beside its title. The denominator is the number of student submission records for that assignment (assigned students). Fully submitted assignments receive a green badge. Missing or failed counts display “Counts unavailable,” never a false zero.
- The content tabs remain under instructor control during automatic announcements.
- Explicit sample preview at `Classroom_Dashboard.html?preview=1`. Fictional assignments never appear as live data.

## Connect the existing spreadsheet

Use a **new standalone Apps Script project**, so its `doGet` does not conflict with the existing dashboard.

1. Copy `Code.gs` into the new project. In Project Settings, enable **Show appsscript.json manifest file in editor** and replace that manifest with the provided `appsscript.json`.
2. In Project Settings → Script properties, add `DASHBOARD_SPREADSHEET_ID` using the ID from the existing Daily Starters spreadsheet URL. Keep this configuration in Apps Script, not the public repository.
3. Confirm the Google Classroom advanced service is enabled. If the script uses a standard Google Cloud project, enable the Google Classroom API in that project too.
4. Run `setupDashboardTabs` once and authorize access as the instructor. It creates only missing tabs and does not replace existing data.
5. Run `listDashboardClassroomCourses`. Copy the appropriate IDs from the private execution log into the **Dashboard Courses** sheet. Match each of the five display labels to its actual Classroom course. Multiple display labels can use the same course ID if appropriate. Do not put course IDs or execution logs into GitHub.
6. Review the schedule and content rules below. Run `testDashboardFeed` to verify content and course retrieval before publishing.
7. When the class-facing content and assignment titles are approved for public display, add Script property `PUBLIC_FEED_ENABLED` with value `true`. The feed remains disabled until this property is set. The JSONP feed is publicly readable: it has no student login or secret URL protection.
8. Deploy → New deployment → Web app. Execute as **Me**, access **Anyone**, where school policy permits. This is a separate feed deployment. If the district prohibits anonymous web apps or public assignment metadata, use a school-authenticated backend instead; do not make the spreadsheet public to work around it.
9. Open the GitHub-hosted dashboard. The current classroom feed is configured as the page default, so every browser connects automatically. Instructor → feed URL → Connect can override it for one browser; that override is saved locally. If a future deployment changes the URL, update `defaultFeedUrl` in `assets/dashboard/dashboard.js` to change the default for everyone. The feed refreshes every minute and caches server results for up to one minute. A newly edited cell can therefore take about two minutes to appear.

GitHub Pages cannot run the Apps Script code. It serves the dashboard page; the separate Apps Script deployment reads Sheets and Classroom. The supplied read-only JSONP transport avoids browser cross-origin fetch issues for this public, class-facing feed.

## Existing content is reused

| Content | Source |
| --- | --- |
| Daily Starter | Active `Calendar` row for the selected date → matching `Week` and `Day` in `Starters` |
| Brain Break | Active row for the selected date in `Brain Breaks`, using its existing column headers |
| Exit Ticket | Active dated row in `Exit Tickets`, otherwise the selected weekday's Exit Ticket column in `Focus Map` |
| Instructional day | Selected date’s `Calendar` row controls activities; today’s row separately controls live phase announcements |
| Title/timezone | `Settings` keys `appTitle` and `timezone` |
| Daily learning target | 1st/2nd Session share the matching weekday’s Learning Target column in `Focus Map` (N:R); 3rd Session uses its own weekday fields (S:W) |
| Focus plan and on-demand supports | Active dated row for the selected session group in `Focus Plans` |

The new `Exit Tickets` tab is optional for daily overrides. Existing Focus Map exit tickets remain the default. Blank or inactive dates do not become sample content.

## Schedule

Defaults preserve the three known sessions: 07:00–08:45, 08:50–10:35, and 12:05–13:50, in America/Detroit.

| Phase | Minutes |
| --- | ---: |
| Daily Starter | 5 |
| Focus | 40 |
| Brain Break | 10 |
| Focus | 40 |
| Cleanup | 10 |

The schedule is editable in `Dashboard Sessions` and `Dashboard Schedule`. Phase durations must total each session's length (105 minutes by default). Career Essentials and Career Exploration have deadline sections but no automatic timing until session timing is specified in code. They are not assigned invented class times.

Loading or refreshing the page does not announce the current phase. Crossing a phase boundary announces it once. When returning to a backgrounded tab, only the current phase is announced, not a queue of missed announcements. A manual phase holds until Resume schedule or the current session ends; outside that session it expires after that phase's duration. At zero, a held manual countdown stays at 00:00 until resumed or expired. Sound is off by default and may require a click before browsers allow it. This is a visual phase cue rather than a dismissal bell system.

The automatic sequence does not switch the content tabs. Exit Ticket is available independently during Cleanup or whenever the instructor selects it.

## Data boundaries

The public feed deliberately omits teacher notes, grades, rosters, individual submission records, student IDs, and assignments targeted to individual students. Only published whole-class assignments with a due date appear. The backend reads only submission states and state-history fields and reduces them to `{submitted,total}` before creating the public response. “Nothing due” means the connected course has no matching whole-class deadlines for that day; failed or missing connections have their own messages.

Submitted includes current `TURNED_IN` work and current `RETURNED` work whose history contains `TURNED_IN`. New, in-progress, reclaimed/unsubmitted work, and returned work without a recorded turn-in are excluded from the numerator. The total includes all submission records, including students who have not opened the assignment. This is the assigned-student count rather than an independently fetched live roster count. Both coursework and submission queries are paginated; a failure on any submission page yields unavailable counts for that assignment without removing its deadline. No individual state, history, name, grade, or identifier is sent to the dashboard.

Due dates arrive from Classroom in UTC and are converted to Michigan time before selecting the current Monday–Sunday week. A Sunday UTC deadline can be a Saturday local deadline. Assignments without due dates are omitted. Each course's API results are paginated.

This is a whole-class display, so an assignment can remain on the list after students submit it. Links still require the normal Classroom permissions when opened.

## Verification

From the repository root:

```sh
node --test tests/classroom-dashboard.test.cjs
```

Browser verification uses Playwright (install it in your development environment if needed):

```sh
python3 -m http.server 8765
# In another terminal:
node tests/classroom-dashboard.browser.cjs
```

The unit tests cover phase boundaries, timezone/week handling, no-school behavior, API pagination and individual-assignment exclusion, and feed field allowlisting. The browser test script covers keyboard tab navigation, mobile overflow, transition banners, and feed failure behavior. These use fixtures, not live Google accounts. School authorization, the actual course IDs, and the deployed feed still require a live connection test.

Build verification: all thirty-seven unit tests passed, including Focus plan date/group selection, active-day behavior, student-facing field allowlisting, target groups, countdowns, and existing feed behavior. Browser verification could not run in the build environment because Chromium was not installed and its download was blocked. Browser assertions include Focus task/support replacement and persistent target visibility, plus timer behavior, for execution in a browser-enabled environment; responsive layout and visual presentation still need that review before classroom use.

## Focus view for the classroom TVs

Choose **Focus** to present the current session’s work plan in the existing large content area. Only the current task and up to three short steps are shown by default. The learning target remains visible above the card. Success criteria, Hint, and Help display one support view at a time; **Back to task** restores the instructions. These controls do not expand the layout or add student-facing columns. Switching class phases continues to announce the transition without automatically changing content tabs.

Edit **Focus Plans** in the existing Daily Starters spreadsheet. Each dated row belongs to either `1st/2nd Session` (shared) or `3rd Session` (separate). The source fields are Date, Group, Title, Task, Step 1–3, Success Criteria, Hint, Help Routine, Resource URL, Resource Label, and Active. Put no more than three short success criteria on separate lines. Keep task/step text brief rather than reducing display fonts. A blank Task or inactive row does not produce a plan.

This week’s active dates have been seeded with the shared CS50P Problem Set 1 work routine, three conditionals criteria, a boundary-test hint, and the “I expected / Instead / I tried” help frame. Third-session rows are ready for their own plans and do not inherit the shared plan. The existing weekday targets and exit tickets are unchanged.

Instructor → **Session content → Session group** previews the chosen group’s Focus plan and learning target for the viewed date. Automatic uses the current class schedule and defaults to Intro outside class hours. Moving to a different date/group resets support views to the task; routine feed refreshes keep the support currently being presented. Missing plans and no-class days have explicit empty states.

To activate, replace the existing feed project’s Code.gs with the current version, then use **Deploy → Manage deployments → Edit → New version → Deploy**. Keep the URL, manifest, and Script properties. The new Focus Plans tab has already been added to the live workbook; setupDashboardTabs also creates it for future installations. Until the updated feed is deployed, the Focus tab shows no scheduled plan.

## Daily learning targets

Edit the matching instructional week's targets in `Focus Map`:

| Group | Monday–Friday fields |
| --- | --- |
| 1st and 2nd Session (shared) | N:R, existing weekday Learning Target fields |
| 3rd Session (separate) | S:W, weekday 3rd Session Learning Target fields |

Week 11's shared target in N:R is “I can use conditionals (if, elif, and else) to make decisions in a Python program.” The 3rd Session fields are separate and remain unchanged. Third Session never inherits a shared target. For the shared group only, an explicit Focus Map target takes precedence over a starter Learning Target field or the first legacy labeled target sentence; the rest of Teacher Notes is never sent.

By default the target follows the session currently meeting, using the real class schedule independently of manual phase overrides. During 1st/2nd Session it shows Intro; during 3rd Session it shows AP. Outside class hours, automatic content defaults to Intro. Instructor → Session content → Session group previews either group for the selected date. Select Automatic to resume schedule-based selection. The preview resets on page reload. The target remains independent of the starter’s discussion topic and persists across activity tabs.

On the classroom display these groups are labeled **Intro** and **AP**, including the Instructor Session content selector. Intro maps to the shared 1st/2nd Session fields; AP maps to the separate 3rd Session fields. Source column names and schedule identifiers retain their existing mappings, so this display-label change needs no feed redeployment. The target strip has a separate small course badge/label row, followed by one uniformly styled, left-aligned statement in 22–28px semibold text with natural word wrapping. Spreadsheet font styling and markup are not imported into the statement.

Replace `Code.gs` in the existing feed project with this version and use Deploy → Manage deployments → Edit → New version → Deploy. Keep the existing deployment URL, properties, and manifest. Planned targets remain available for calendar dates marked no class, while starters, exit tickets, Focus plans, and live phase timing remain paused. If the selected date has no target (or an older feed omits it), the strip displays a clear unavailable message. Updating the feed is required to expose planned targets on no-class dates; source targets are never fabricated or borrowed from another date/group.

## Popup timer

Select **Timer** in the header, choose a preset or enter minutes, then select Start. The same button becomes Pause/Resume. **+30 sec** and **+1 min** extend the remaining time without changing whether the timer is running or paused. After completion, adding time leaves it paused until Resume is selected. Reset stops the countdown and restores the original selected duration, excluding extensions. Time additions are limited to 180 minutes remaining.

Drag the timer's title with a mouse or touch. With the title focused, arrow keys move by 10 pixels, Shift+arrow by 30 pixels, and Home recenters it. **Center** also restores the middle position. The window stays within the viewport, keeps its position when closed/reopened, and is constrained again after resizing. Position resets on page reload. The timer is a floating nonmodal window, so the dashboard remains usable while it is open.

Closing the window or pressing Escape keeps it running; reopen it using the header button, which shows the remaining time. At zero, it opens once with “Time’s up!” and an optional soft chime when sound is enabled. Class phase announcements remain available while the timer is open.

Countdowns use a deadline, so delayed browser updates do not extend the duration. Browser/device suspension can delay the completion notification until the page runs again. Reloading the page resets the timer. No Apps Script update is needed for the popup timer or for changing existing target cells.

## Update an existing feed for submission counts

1. Replace the existing standalone feed project's `Code.gs` with the updated file in this folder. Keep the current manifest and Script properties; the existing coursework read-only permission covers submission queries.
2. Run `testDashboardFeed`. For each course with weekly assignments, `submissionCountsReady` should equal `count`. A course with no assignments correctly reports both as zero. If counts fail, review the private execution logs and authorization.
3. Choose **Deploy → Manage deployments → Edit** (pencil) on the existing web app. Select **New version**, then **Deploy**. Updating the existing deployment preserves the `/exec` URL already configured in the dashboard. Do not create another deployment.
4. Refresh the dashboard. Counts update with the regular feed refresh and cache, generally within two minutes. Until the feed code is updated, the new dashboard displays “Counts unavailable” beside assignments.

## Update an existing feed for date navigation

Replace `Code.gs` with the current version and update the **existing** web app using Deploy → Manage deployments → Edit → New version → Deploy. Keep the manifest, Script properties, and deployment URL. This also includes submission counts if that earlier update has not yet been installed.

The feed accepts an optional `date=YYYY-MM-DD` query parameter, validates real dates from 1900 through 2100, and caches each requested date separately. A request without a date follows today. `date` identifies the viewed content, while `today` and `todayInstructionalDay` identify the live schedule. Weekday headings show dates from the viewed week, with no empty days. Past-date submission counts remain current totals, not historical snapshots. If the old feed ignores the selected date, the dashboard keeps the loaded content/date and displays an update message rather than mislabeling today’s content.

## Connect school-calendar notices

The latest `Code.gs` connects by default to the existing School_Calendar_Master spreadsheet, using the same source as the No School viewer. Update the existing Apps Script web app to a new version after replacing Code.gs; keep its current URL, manifest, and properties. The instructor account executing the script needs read access to that calendar. Optional Script property `NO_SCHOOL_SPREADSHEET_ID` overrides the default source.

Only date-matched school/event text is exposed, with duplicates removed and the matching July–June school year applied. Source URLs and verification columns do not enter the feed. Notices cache for fifteen minutes, plus the regular feed refresh delay. A calendar read failure shows Calendar unavailable and preserves the Daily Starters Calendar’s normal schedule instead of pretending no schools are closed. The existing No School viewer and source spreadsheet are not modified.

References: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Apps Script Content Service](https://developers.google.com/apps-script/guides/content), [Classroom advanced service](https://developers.google.com/apps-script/advanced/classroom), [Classroom coursework fields](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork).

### Announcements from Reminders

The right column displays assignments, **Announcements**, then school notices. Announcements stay expanded and the section hides when the viewed date has no reminders. They remain available between sessions and on no-class dates without activating class timing. The existing `Reminders` tab is reused; only active matching rows' Title and Message are published. Messages are plain text with line breaks preserved.

Supported Type values are `Date`, `Weekly First Day`, and `Weekly Last Day`. Date rows use ISO dates (`YYYY-MM-DD`); weekly rows use the first/last active date in the selected week's Calendar rows. Existing Active rules apply. Missing Reminders tabs produce an empty section, and older feed versions remain compatible (no announcements shown).

To activate after this update, replace Code.gs and deploy a **New version** of the existing web app through **Manage deployments**. Keep its URL and Script properties. No manifest changes are required. The existing November 12 and 13 Blood Drive rows will display on those dates with their 7 AM–1 PM message.
