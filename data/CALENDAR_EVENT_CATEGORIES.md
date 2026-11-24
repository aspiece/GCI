# School Calendar Viewer — Event Categories

This is the standard display taxonomy for `No_School_Viewer.html`. The published Google Sheet remains the source of truth: categories are **derived in the viewer** and do not change the underlying calendar records.

## Categories (display order)

| Category | Matching examples | Notes |
| --- | --- | --- |
| No School | No School, No School - Thanksgiving Break, Staff PD (No Students), Intersession (No Regular School) | Explicit no-school or no-student wording takes priority, including grade-specific closures. Read the original details to confirm who is affected. |
| Early Release | Early Release, Early Dismissal, Two-Hour Early Dismissal, Reduced Day, Homecoming - 2:00 PM Dismissal | Shorter days not explicitly labelled Half Day. |
| Half Day | Half Day, Half Day - Exams, Half Day - First Day of School | Takes priority over the words break, testing, or first/last day when no full closure is stated. |
| Late Start | Late Start Wednesday, Delayed Start, Delayed Day | Later-than-usual start. |
| Holiday / Break | Holiday, Recess, Break | Used only where no full no-school wording or shortened-day wording is present. Do not assume a listed holiday means a closure. |
| Staff / PD Day | Teacher PD, Professional Development, Teacher Work Day | When the record explicitly says No School / No Students, it goes under No School. |
| First / Last Day | First Day of School, Last Day of School, Classes Resume, Seniors Last Day | If the day is also an explicit Half Day or Early Release, the shorter-day category wins. |
| Conferences | Parent-Teacher Conferences | If the entry says Half Day / Early Release, that shortened-day label wins. |
| Testing / Exams | Final Exams, SAT, M-STEP, Testing | Does not override shortened-day or no-school information. |
| Other Events | Graduation Day, Virtual Day, Flex Day, Marking Period Ends | Entries that cannot safely be inferred to fit one of the other categories. |

## User experience

- Each day in the three-week overview groups entries under standard category headings.
- **No School** is expanded by default in the weekly overview, with schools sorted alphabetically.
- Other categories can be expanded to show their schools. Groups in the month view start collapsed to keep the grid readable.
- Selecting a school opens a details dialog showing the date, exact source event text, school year, extra notes when provided, original calendar source (linked only for HTTP/HTTPS URLs), and last verification date when known.
- The category dropdown filters standardized categories, rather than hundreds of individual source phrases.
- Search matches school names, source event descriptions, category labels, notes and school years.
- Only the category labels are normalized: **original source wording is preserved**, including distinctions by grade, session, or building.
- When live Google data cannot be reached, the viewer uses a **dated** same-origin CSV snapshot with clear freshness messaging.

## Maintenance and safety

Edit the `EVENT_CATEGORIES` list and `classifyEvent()` function in `No_School_Viewer.html` when new calendar phrases appear. Test classification against the existing `data/school-calendar.csv` values. Keep explicit closure and shortened-day precedence above generic holiday, PD, and exam keywords.

The calendar is **not** a real-time weather or emergency closing service. Official school or district announcements take precedence. The classification rules must not silently turn an ordinary event into an asserted No School day without explicit supporting wording.
