/**
 * End-to-end test: Parser → Subject Filter → Calendar dayStatusMap → Dot rendering
 * Uses the actual ETLAB HTML provided by the user.
 */
import * as cheerio from 'cheerio';

// ── Step 1: Real ETLAB HTML (from user) ─────────────────────────────────────
const html = `<form action="/ktuacademics/student/attendance" method="post"><select name="semester" id="semester">
<option value="6" selected="selected">VIth Semester</option>
</select>
<br/><br/>
<select name="month" id="month">
<option value="12">Dec</option>
<option value="1">Jan</option>
<option value="2" selected="selected">Feb</option>
<option value="3">Mar</option>
<option value="4">Apr</option>
</select>	<select name="year" id="year">
<option value="2025">2025</option>
<option value="2026" selected="selected">2026</option>
</select>
</form>
<table id="itsthetable">
<thead>
<tr>
<th>Date</th><th>Period 1</th><th>Period 2</th><th>Period 3</th><th>Period 4</th><th>Period 5</th><th>Period 6</th><th>Period 7</th><th>Period 8</th><th>Period 9</th>
</tr>
</thead>
<tbody>
<tr>
<th class="sun-day">1<sup>st</sup></th>
<td class="holiday" colspan="9"></td>
</tr>
<tr>
<th >2<sup>nd</sup></th>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 present"><a class="tool-tip">CST302 - COMPILER DESIGN
<span class="classic" style="background-color: #050100;width:180px; height:140px;">Augmented Grammar, Canonical collection of LR(0) items</span></a></td>
<td class="span1 present"><a class="tool-tip">CSD334 - Miniproject
<span class="classic" style="background-color: #050100;width:180px; height:140px;"></span></a></td>
<td class="span1 present"><a class="tool-tip">CSD334 - Miniproject
<span class="classic" style="background-color: #050100;width:180px; height:140px;"></span></a></td>
<td class="span1 present"><a class="tool-tip">CSD334 - Miniproject
<span class="classic" style="background-color: #050100;width:180px; height:140px;"></span></a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
</tr>
<tr>
<th >3<sup>rd</sup></th>
<td class="span1 present"><a class="tool-tip">CST362 - Programming in Python
<span class="classic" style="background-color: #050100;width:180px; height:140px;">Graphics</span></a></td>
<td class="span1 present"><a class="tool-tip">CST362 - Programming in Python
<span class="classic" style="background-color: #050100;width:180px; height:140px;">Colors</span></a></td>
<td class="span1 present"><a class="tool-tip">CST302 - COMPILER DESIGN
<span class="classic" style="background-color: #050100;width:180px; height:140px;">SLR Parser</span></a></td>
<td class="span1 present"><a class="tool-tip">CST362 - Programming in Python
<span class="classic" style="background-color: #050100;width:180px; height:140px;">Image Processing</span></a></td>
<td class="span1 present"><a class="tool-tip">HUT300 - INDUSTRIAL ECONOMICS & FOREIGN TRADE
<span class="classic" style="background-color: #050100;width:180px; height:140px;">Cost Concepts</span></a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
</tr>
<tr>
<th >4<sup>th</sup></th>
<td class="span1 present"><a class="tool-tip">HUT300 - INDUSTRIAL ECONOMICS & FOREIGN TRADE
<span class="classic" style="background-color: #050100;width:180px; height:140px;"></span></a></td>
<td class="span1 present"><a class="tool-tip">HUT300 - INDUSTRIAL ECONOMICS & FOREIGN TRADE
<span class="classic" style="background-color: #050100;width:180px; height:140px;"></span></a></td>
<td class="span1 absent"><a class="tool-tip">CST302 - COMPILER DESIGN
<span class="classic" style="background-color: #050100;width:180px; height:140px;">CLR parsing</span></a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
<td class="span1 n-a"><a class="tool-tip">
</a></td>
</tr>
</tbody>
</table>`;

// ── Step 2: Parser (same as etlab-parser.ts) ────────────────────────────────
function parseAttendanceHistory(html) {
  const records = [];
  const $ = cheerio.load(html);

  const year = parseInt($('select[name="year"] option:selected').val()) || 2026;
  const month = parseInt($('select[name="month"] option:selected').val()) || 6;

  $('#itsthetable tbody tr').each((_, row) => {
    const $row = $(row);
    const dayText = $row.find('th').text().replace(/\D/g, '');
    const day = parseInt(dayText);
    if (isNaN(day)) return;

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    $row.find('td').each((periodIdx, cell) => {
      const $cell = $(cell);
      const className = $cell.attr('class') || '';

      const isPresent = className.includes('present');
      const isAbsent = className.includes('absent');
      if (!isPresent && !isAbsent) return;

      const $a = $cell.find('a.tool-tip');
      const rawText = $a.contents().first().text().trim();
      const codeMatch = rawText.match(/[A-Z]{2,4}\d{2,4}[A-Z]?/i);

      let subjectCode;
      if (codeMatch) {
        subjectCode = codeMatch[0].toUpperCase();
      } else {
        const dashIdx = rawText.indexOf(' - ');
        subjectCode = (dashIdx > 0 ? rawText.substring(0, dashIdx) : rawText).trim();
        if (!subjectCode) return;
      }

      records.push({
        date: dateStr,
        subject: subjectCode,
        hour: periodIdx + 1,
        status: isPresent ? 'present' : 'absent',
      });
    });
  });

  return records;
}

// Helper to extract subject code (e.g. "CST302" from "CST302 - Compiler Design")
const getCode = (str) => {
  const match = str.match(/[A-Z]{2,4}\d{2,4}[A-Z]?/i);
  return match ? match[0].toUpperCase() : str.trim().toUpperCase();
};

// ── Step 3: Run parser ──────────────────────────────────────────────────────
const allRecords = parseAttendanceHistory(html);

console.log('═══════════════════════════════════════════════════════');
console.log('  STEP 1: PARSER OUTPUT');
console.log('═══════════════════════════════════════════════════════');
console.log(`Total records: ${allRecords.length}\n`);
console.table(allRecords);

// ── Step 4: Subject filter (same as AttendanceCalendar.tsx) ─────────────────
// Simulating subjects parsed from the main summary page (which includes full names/headers)
const subjects = [
  'CST302 - COMPILER DESIGN',
  'CSD334 - Miniproject',
  'CST362 - Programming in Python',
  'HUT300 - INDUSTRIAL ECONOMICS & FOREIGN TRADE'
];
console.log('\n═══════════════════════════════════════════════════════');
console.log('  STEP 2: SUBJECT CARDS DISPLAYED ON DASHBOARD');
console.log('═══════════════════════════════════════════════════════');
console.log(subjects);


// ── Step 5: For EACH subject, simulate the calendar's dayStatusMap ──────────
for (const subjectCode of subjects) {
  console.log(`\n───────────────────────────────────────────────────────`);
  console.log(`  SUBJECT CARD: ${subjectCode}`);
  console.log(`───────────────────────────────────────────────────────`);

  // Filter using robust code matching (same as the proposed AttendanceCalendar fix)
  const targetCode = getCode(subjectCode);
  const subjectRecords = allRecords.filter(
    r => getCode(r.subject) === targetCode
  );
  console.log(`  Filtered records for code "${targetCode}": ${subjectRecords.length}`);
  console.table(subjectRecords);


  // Build dayStatusMap (same logic as AttendanceCalendar line 71-87)
  const byDate = {};
  for (const r of subjectRecords) {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  }

  const dayStatusMap = {};
  for (const [date, recs] of Object.entries(byDate)) {
    const allPresent = recs.every(r => r.status === 'present');
    const allAbsent = recs.every(r => r.status === 'absent');
    dayStatusMap[date] = allPresent ? 'present' : allAbsent ? 'absent' : 'partial';
  }

  console.log(`\n  dayStatusMap (what drives the dots):`);
  for (const [date, status] of Object.entries(dayStatusMap)) {
    const dot = status === 'present' ? '🟢' : status === 'absent' ? '🔴' : '🟡';
    console.log(`    ${date} → ${dot} ${status}`);
  }

  // Auto-navigate check: what month would the calendar show?
  if (subjectRecords.length > 0) {
    const lastDate = subjectRecords[subjectRecords.length - 1].date;
    const [y, m] = lastDate.split('-').map(Number);
    console.log(`\n  Calendar auto-navigates to: ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} ${y}`);

    // Simulate calendar date string generation for that month
    const calendarMonth = m - 1; // 0-indexed
    const calendarYear = y;
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    let dotsRendered = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = dayStatusMap[dateStr];
      if (status) dotsRendered++;
    }
    console.log(`  Dots that would render: ${dotsRendered}`);
    if (dotsRendered > 0) {
      console.log(`  ✅ DOTS WILL SHOW`);
    } else {
      console.log(`  ❌ NO DOTS — date format mismatch!`);
    }
  }
}

// ── Step 6: Also test "ALL" (cumulative) mode ───────────────────────────────
console.log(`\n───────────────────────────────────────────────────────`);
console.log(`  CUMULATIVE CARD: ALL`);
console.log(`───────────────────────────────────────────────────────`);
const byDateAll = {};
for (const r of allRecords) {
  if (!byDateAll[r.date]) byDateAll[r.date] = [];
  byDateAll[r.date].push(r);
}
const dayStatusMapAll = {};
for (const [date, recs] of Object.entries(byDateAll)) {
  const allPresent = recs.every(r => r.status === 'present');
  const allAbsent = recs.every(r => r.status === 'absent');
  dayStatusMapAll[date] = allPresent ? 'present' : allAbsent ? 'absent' : 'partial';
}
for (const [date, status] of Object.entries(dayStatusMapAll)) {
  const dot = status === 'present' ? '🟢' : status === 'absent' ? '🔴' : '🟡';
  console.log(`  ${date} → ${dot} ${status}`);
}

// ── Step 7: Explicit assertion for green dots per subject ───────────────────
console.log('\n═══════════════════════════════════════════════════════');
console.log('  VERIFICATION: CHECK FOR GREEN DOTS PER SUBJECT CARD');
console.log('═══════════════════════════════════════════════════════');

let allSubjectsHaveGreenDots = true;

for (const subjectCode of subjects) {
  const targetCode = getCode(subjectCode);
  const subjectRecords = allRecords.filter(
    r => getCode(r.subject) === targetCode
  );

  const byDate = {};
  for (const r of subjectRecords) {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  }

  const dayStatusMap = {};
  for (const [date, recs] of Object.entries(byDate)) {
    const allPresent = recs.every(r => r.status === 'present');
    const allAbsent = recs.every(r => r.status === 'absent');
    dayStatusMap[date] = allPresent ? 'present' : allAbsent ? 'absent' : 'partial';
  }

  // Check if at least one day in dayStatusMap has status 'present' (which renders a green dot)
  const hasGreenDot = Object.values(dayStatusMap).some(status => status === 'present');
  
  if (hasGreenDot) {
    console.log(`  ✅ Subject "${subjectCode}": Green dots (Present) are present in the calendar UI.`);
  } else {
    console.log(`  ❌ Subject "${subjectCode}": NO green dots found!`);
    allSubjectsHaveGreenDots = false;
  }
}

console.log('\n───────────────────────────────────────────────────────');
if (allSubjectsHaveGreenDots) {
  console.log('  🎉 SUCCESS: All subject cards will successfully show green dots!');
} else {
  console.log('  ⚠️ WARNING: Some subject cards do not show green dots.');
}
console.log('───────────────────────────────────────────────────────\n');

