# Classroom dashboard setup

The new page is `Classroom_Dashboard.html`. It is independent of the current Apps Script dashboard. No existing GCI page is replaced.

## What is ready

- Daily Starter, Brain Break, and Exit Ticket content tabs.
- Compact class progress and countdown: Daily Starter → Focus → Brain Break → Focus → Cleanup.
- A six-second visual announcement when a phase starts, optional chime, manual phase selection, repeat announcement, and return to scheduled timing.
- Due This Week: collapsible sections for 1st Session, 2nd Session, 3rd Session, Career Essentials, and Career Exploration. The active session opens automatically when it changes, together with Career Essentials for 1st/2nd Session or Career Exploration for 3rd Session. Instructors can expand or collapse any section.
- Only days with assignments due are listed, including weekend deadlines. Courses with no deadlines show one “Nothing due this week” message. Times use America/Detroit, including daylight saving changes. Earlier days are muted and today is highlighted.
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
9. Open the GitHub-hosted dashboard → Instructor → paste the new `/exec` deployment URL → Connect. The URL is saved only in that browser. The feed refreshes every minute and caches server results for up to one minute. A newly edited cell can therefore take about two minutes to appear.

GitHub Pages cannot run the Apps Script code. It serves the dashboard page; the separate Apps Script deployment reads Sheets and Classroom. The supplied read-only JSONP transport avoids browser cross-origin fetch issues for this public, class-facing feed.

## Existing content is reused

| Content | Source |
| --- | --- |
| Daily Starter | Active `Calendar` row for today → matching `Week` and `Day` in `Starters` |
| Brain Break | Active row for today in `Brain Breaks`, using its existing column headers |
| Exit Ticket | Active dated row in `Exit Tickets`, otherwise the current weekday's Exit Ticket column in `Focus Map` |
| Instructional day | `Calendar` row and `Active`; no phase announcements or activity content on inactive dates |
| Title/timezone | `Settings` keys `appTitle` and `timezone` |

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

The feed deliberately omits teacher notes, grades, rosters, student submissions, individual student IDs, and assignments targeted to individual students. Only published whole-class assignments with a due date appear. It makes no submission-state calls. “Nothing due” means the connected course has no matching whole-class deadlines for that day; failed or missing connections have their own messages.

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

Build verification: all nine unit tests passed. Browser verification could not run in the build environment because Chromium was not installed and its download was blocked. The browser script is included for execution in a browser-enabled environment; responsive layout and visual presentation still need that review before classroom use.

References: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Apps Script Content Service](https://developers.google.com/apps-script/guides/content), [Classroom advanced service](https://developers.google.com/apps-script/advanced/classroom), [Classroom coursework fields](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork).
