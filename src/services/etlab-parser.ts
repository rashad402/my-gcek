/**
 * ETLAB HTML Parser
 *
 * Pure functions that convert raw ETLAB HTML pages into the TypeScript
 * data structures used by the app's UI screens.
 *
 * Consolidated on Cheerio for all HTML parsing to prevent ReDoS,
 * scope tables correctly, and decode HTML entities robustly.
 */

import * as cheerio from 'cheerio/slim';

const MAX_HTML_LENGTH = 1.5 * 1024 * 1024; // 1.5 MB
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

// ─── Shared helpers ─────────────────────────────────────────────────────────

/**
 * Split a raw subject string on the first space-hyphen-space (' - ') separator.
 * Prevents truncating subjects containing hyphens (e.g. "COMPILER DESIGN - LAB")
 * or splitting codes like "MA-101".
 */
function splitSubject(rawSubject: string): { subject: string; subjectName: string } {
  const cleanRaw = rawSubject.trim();
  const separatorIdx = cleanRaw.indexOf(' - ');
  if (separatorIdx !== -1) {
    const subject = cleanRaw.substring(0, separatorIdx).trim();
    const subjectName = cleanRaw.substring(separatorIdx + 3).trim();
    return { subject, subjectName };
  }
  return { subject: cleanRaw, subjectName: '' };
}

// ─── Attendance ─────────────────────────────────────────────────────────────

export interface SubjectAttendance {
  /** Subject / course name */
  subject: string;
  /** Name of the professor (may be empty if not in the table) */
  professor: string;
  /** Attendance percentage (0–100) */
  percentage: number;
  /** Number of classes attended */
  attended: number;
  /** Total number of classes */
  total: number;
}

/**
 * Parse the ETLAB attendance page HTML.
 * Supports both horizontal (student roster) and vertical layouts.
 */
export function parseAttendance(html: string, studentRollNo?: string): SubjectAttendance[] {
  const results: SubjectAttendance[] = [];

  if (html.length > MAX_HTML_LENGTH) {
    throw new Error('HTML payload too large');
  }

  const $ = cheerio.load(html);
  const $tables = $('table');
  if ($tables.length === 0) return results;

  $tables.each((_, tableEl) => {
    const $table = $(tableEl);
    
    // Extract headers
    const headers: string[] = [];
    $table.find('thead th, tr:first-child th').each((_, thEl) => {
      headers.push($(thEl).text().trim().toLowerCase());
    });
    
    if (headers.length === 0) {
      $table.find('tr:first-child td').each((_, tdEl) => {
        headers.push($(tdEl).text().trim().toLowerCase());
      });
    }

    const isHorizontal = headers.some(h => /reg\s*no|roll\s*no|name/i.test(h));

    if (isHorizontal) {
      const rows: string[][] = [];
      $table.find('tbody tr, tr').each((rowIdx, trEl) => {
        if (rowIdx === 0 && $table.find('thead').length === 0) return;
        
        const cells: string[] = [];
        $(trEl).find('td').each((_, tdEl) => {
          cells.push($(tdEl).text().trim());
        });
        if (cells.length > 0) {
          rows.push(cells);
        }
      });

      if (rows.length === 0) return;

      // Match the logged-in student's row via roll number / register number
      const regNoIdx = headers.findIndex(h => /reg\s*no|roll\s*no/i.test(h));
      let cells = rows[0];
      if (studentRollNo && regNoIdx !== -1) {
        const targetRoll = studentRollNo.trim().toLowerCase();
        const matchedRow = rows.find(r => {
          const cellVal = (r[regNoIdx] || '').trim().toLowerCase();
          return cellVal === targetRoll || cellVal.replace(/[^a-z0-9]/g, '') === targetRoll.replace(/[^a-z0-9]/g, '');
        });
        if (matchedRow) {
          cells = matchedRow;
        } else {
          if (isDev) {
            console.warn(`[Parser] studentRollNo "${studentRollNo}" not matched in roster. Using first row.`);
          }
        }
      }

      // Map headers to cells
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i].trim();
        if (/reg\s*no|roll\s*no|name|total|percentage/i.test(header) || !header) {
          continue;
        }
        
        const cellVal = cells[i] ? cells[i].trim() : '';
        if (!cellVal) continue;
        
        const match = cellVal.match(/(\d+)\s*\/\s*(\d+)(?:\s*\(\s*(\d+)\s*%\s*\))?/);
        if (match) {
          const attended = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          const percentage = match[3] 
            ? parseFloat(match[3]) 
            : (total > 0 ? Math.round((attended / total) * 100) : 0);
            
          results.push({
            subject: header,
            professor: '',
            percentage: Math.round(percentage * 10) / 10,
            attended,
            total,
          });
        }
      }
    } else {
      // Vertical Table Parser
      const subjectIdx = headers.findIndex(h => h.includes('subject') || h.includes('course') || h.includes('paper') || h.includes('code'));
      const totalIdx = headers.findIndex(h => h.includes('total') || h.includes('conducted') || (h.includes('hours') && !h.includes('present') && !h.includes('absent')));
      const presentIdx = headers.findIndex(h => h.includes('present') || h.includes('attended') || h.includes('present hours'));
      const percentageIdx = headers.findIndex(h => h.includes('percentage') || h.includes('%'));

      $table.find('tbody tr, tr').each((rowIdx, trEl) => {
        if ($(trEl).find('th').length > 0) return; // skip header tr
        if (rowIdx === 0 && $table.find('thead').length === 0) return;

        const cells: string[] = [];
        $(trEl).find('td').each((_, tdEl) => {
          cells.push($(tdEl).text().trim());
        });

        if (cells.length < 2) return;

        const firstCell = cells[0].toLowerCase();
        if (firstCell.includes('total') || firstCell.includes('no records') || firstCell.includes('no attendance')) {
          return;
        }

        let subject = '';
        let total = 0;
        let attended = 0;
        let percentage = 0;

        if (subjectIdx !== -1) {
          subject = cells[subjectIdx];
        } else {
          const nonNumericCell = cells.find(c => isNaN(Number(c.trim())) && c.trim().length > 1);
          subject = nonNumericCell || cells[0];
        }

        if (!subject || subject.toLowerCase().includes('total')) return;

        if (totalIdx !== -1 && cells[totalIdx]) {
          total = parseFloat(cells[totalIdx].replace(/[^\d.]/g, '')) || 0;
        }
        if (presentIdx !== -1 && cells[presentIdx]) {
          attended = parseFloat(cells[presentIdx].replace(/[^\d.]/g, '')) || 0;
        }
        if (percentageIdx !== -1 && cells[percentageIdx]) {
          percentage = parseFloat(cells[percentageIdx].replace(/[^\d.]/g, '')) || 0;
        }

        // Apply robust heuristics if indices are missing
        if (totalIdx === -1 || presentIdx === -1) {
          const nums: number[] = [];
          cells.forEach(c => {
            const cleanVal = c.replace(/[%\s]/g, '');
            const num = parseFloat(cleanVal);
            if (!isNaN(num) && cleanVal === String(num)) {
              nums.push(num);
            }
          });

          if (nums.length >= 3) {
            total = nums[0];
            attended = nums[1];
            percentage = nums[2];
          } else if (nums.length === 2) {
            if (nums[0] === nums[1]) {
              attended = nums[0];
              total = nums[1];
              percentage = 100;
            } else if (nums[1] > nums[0]) {
              attended = nums[0];
              total = nums[1];
              percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
            } else {
              total = nums[0];
              percentage = nums[1];
              attended = total > 0 ? Math.round((percentage / 100) * total) : 0;
            }
          }
        }

        if (percentage === 0 && total > 0) {
          percentage = (attended / total) * 100;
        }

        if (percentage > 100) percentage = 100;
        if (percentage < 0) percentage = 0;

        results.push({
          subject: subject.trim(),
          professor: '',
          percentage: Math.round(percentage * 10) / 10,
          attended,
          total,
        });
      });
    }
  });

  return results;
}

// ─── Attendance History ─────────────────────────────────────────────────────

export interface AttendanceFormOptions {
  semester: string;
  months: { value: string; label: string }[];
  years: string[];
  selectedMonth: string;
  selectedYear: string;
}

/**
 * Extract form options from attendance page.
 */
export function parseAttendanceFormOptions(html: string): AttendanceFormOptions {
  const $ = cheerio.load(html);

  const semester = (
    $('select[name="semester"] option:selected').val() ||
    $('select[name="semester"] option[selected]').val() ||
    ''
  ) as string;

  const months: { value: string; label: string }[] = [];
  $('select[name="month"] option').each((_, el) => {
    const val = $(el).val() as string;
    const label = $(el).text().trim();
    if (val) months.push({ value: val, label });
  });

  const years: string[] = [];
  $('select[name="year"] option').each((_, el) => {
    const val = $(el).val() as string;
    if (val) years.push(val);
  });

  const selectedMonth = (
    $('select[name="month"] option:selected').val() ||
    $('select[name="month"] option[selected]').val() ||
    ''
  ) as string;

  const selectedYear = (
    $('select[name="year"] option:selected').val() ||
    $('select[name="year"] option[selected]').val() ||
    ''
  ) as string;

  if (isDev) {
    console.log('[parseAttendanceFormOptions]', {
      semester,
      months: months.map(m => `${m.label}(${m.value})`).join(', '),
      years: years.join(', '),
      selectedMonth,
      selectedYear,
    });
  }

  return { semester, months, years, selectedMonth, selectedYear };
}

export interface AttendanceRecord {
  /** Date string in 'YYYY-MM-DD' format */
  date: string;
  subject: string;
  hour: number;
  status: 'present' | 'absent';
}

/**
 * Parse daily attendance history. Fail-fast if month or year is unparseable.
 */
export function parseAttendanceHistory(html: string): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];

  if (html.length > MAX_HTML_LENGTH) {
    throw new Error('HTML payload too large');
  }

  const $ = cheerio.load(html);

  const yearVal = ($('select[name="year"] option:selected').val() || $('select[name="year"] option[selected]').val()) as string;
  const monthVal = ($('select[name="month"] option:selected').val() || $('select[name="month"] option[selected]').val()) as string;
  
  const parsedYear = parseInt(yearVal, 10);
  const parsedMonth = parseInt(monthVal, 10);

  if (isNaN(parsedYear) || isNaN(parsedMonth)) {
    throw new Error(
      `Failed to extract valid year/month from attendance history HTML. ` +
      `yearVal="${yearVal}", monthVal="${monthVal}"`
    );
  }

  const year = parsedYear;
  const month = parsedMonth;

  if (isDev) {
    console.log('[parseAttendanceHistory] Parsed keys:', { yearVal, monthVal, year, month });
  }

  const $table = $('#itsthetable');
  if ($table.length === 0) {
    if (isDev) {
      console.warn('[Parser] #itsthetable not found in attendance history HTML.');
    }
    return records;
  }

  const $tbody = $table.find('tbody');
  const $rows = $tbody.find('tr');
  const $allRows = $rows.length > 0 ? $rows : $table.find('tr');

  $allRows.each((rowIdx, row) => {
    const $row = $(row);

    const thText = $row.find('th').text().trim();
    const match = thText.match(/\b\d{1,2}\b/);
    let day = match ? parseInt(match[0], 10) : NaN;
    if (isNaN(day) || day < 1 || day > 31) {
      const fallbackMatch = thText.match(/\d+/);
      day = fallbackMatch ? parseInt(fallbackMatch[0], 10) : NaN;
    }
    
    // Bounds validation
    if (isNaN(day) || day < 1 || day > 31) {
      return;
    }

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const $cells = $row.find('td');

    $cells.each((periodIdx, cell) => {
      const $cell = $(cell);
      const className = $cell.attr('class') || '';

      const isPresent = className.includes('present');
      const isAbsent = className.includes('absent');

      if (!isPresent && !isAbsent) return;

      const $a = $cell.find('a.tool-tip');
      const rawText = $a.contents().first().text().trim();
      const codeMatch = rawText.match(/[A-Z]{2,4}\d{2,4}[A-Z]?/i);

      let subjectCode: string;
      if (codeMatch) {
        subjectCode = codeMatch[0].toUpperCase();
      } else {
        const dashIdx = rawText.indexOf(' - ');
        subjectCode = (dashIdx > 0 ? rawText.substring(0, dashIdx) : rawText).trim();
        if (!subjectCode) return;
        if (isDev) {
          console.warn(`[Parser] Non-standard subject code: "${subjectCode}" from raw text: "${rawText}"`);
        }
      }

      records.push({
        date: dateStr,
        subject: subjectCode,
        hour: periodIdx + 1,
        status: isPresent ? 'present' : 'absent',
      });
    });
  });

  if (isDev) {
    console.log(`[parseAttendanceHistory] Successfully parsed ${records.length} records for ${year}-${month}`);
  }
  return records;
}

/**
 * Normalize date strings with range validations (year 2000-2100).
 */
export function normalizeDate(raw: string): string | null {
  // YYYY-MM-DD or YYYY/MM/DD
  let match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  // DD-MM-YYYY or DD/MM/YYYY
  match = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return null;
}

// ─── Results ────────────────────────────────────────────────────────────────

export interface ResultEntry {
  /** Exam / assessment name (e.g. "Series 1") */
  name: string;
  /** Marks obtained (null if not entered yet) */
  marks: number | null;
  /** Total marks possible */
  total: number;
  /** Grade if available */
  grade: string;
}

export interface SubjectResult {
  /** Subject / course name */
  subject: string;
  /** Full course name if available */
  subjectName?: string;
  /** List of exam results for this subject */
  results: ResultEntry[];
}

function cleanExamName(sectionTitle: string, examVal: string): string {
  const sec = sectionTitle.trim();
  const secLower = sec.toLowerCase();
  const val = examVal.trim();
  const valLower = val.toLowerCase();

  if (/^\d+$/.test(val)) {
    const num = parseInt(val, 10);
    if (secLower.includes('sessional exam') || secLower.includes('sessional') || secLower.includes('exam')) {
      return `Series ${num}`;
    }
    if (secLower.includes('assignment')) {
      return `Assignment ${num}`;
    }
    if (secLower.includes('module')) {
      return `Module Test ${num}`;
    }
    if (secLower.includes('project')) {
      return `Project ${num}`;
    }
    if (secLower.includes('tutorial')) {
      return `Tutorial ${num}`;
    }
    if (secLower.includes('seminar')) {
      return `Seminar ${num}`;
    }
    if (secLower.includes('lab evaluation') || secLower.includes('evaluation')) {
      return `Lab Evaluation ${num}`;
    }
    if (secLower.includes('lab internal') || secLower.includes('internal test')) {
      return `Lab Internal ${num}`;
    }
    if (secLower.includes('university') || sec === '') {
      if (num === 1) return 'Regular';
      if (num === 2) return 'Supplementary / Revaluation';
      return `Supplementary ${num - 1}`;
    }
    return `${sec} ${num}`;
  }

  if (valLower === 'result 1') return 'Regular';
  if (valLower === 'result 2') return 'Supplementary / Revaluation';
  if (valLower === 'result 3') return 'Supplementary 2';
  if (valLower === 'result 4') return 'Supplementary 3';

  if (val) {
    if (secLower.includes(valLower)) return sec || 'Sessional Marks';
    return sec ? `${sec} - ${val}` : val;
  }
  return sec || 'Sessional Marks';
}

/**
 * Parse results page. Outputs plaintext strings only. Consolidates on Cheerio.
 */
export function parseResults(html: string): SubjectResult[] {
  const results: SubjectResult[] = [];

  if (html.length > MAX_HTML_LENGTH) {
    throw new Error('HTML payload too large');
  }

  const $ = cheerio.load(html);
  const $tables = $('table');
  if ($tables.length === 0) return results;

  $tables.each((_, tableEl) => {
    const $table = $(tableEl);
    
    // Find preceding heading
    let sectionTitle = '';
    const $caption = $table.find('caption');
    if ($caption.length > 0) {
      sectionTitle = $caption.text().trim();
    } else {
      let $prev = $table.prev();
      while ($prev.length > 0) {
        const tagName = ($prev[0] as any).name;
        if (/^h[1-6]$/i.test(tagName)) {
          sectionTitle = $prev.text().trim();
          break;
        }
        $prev = $prev.prev();
      }
    }

    const headers: string[] = [];
    $table.find('thead th, tr:first-child th').each((_, thEl) => {
      headers.push($(thEl).text().trim().toLowerCase());
    });
    
    if (headers.length === 0) {
      $table.find('tr:first-child td').each((_, tdEl) => {
        headers.push($(tdEl).text().trim().toLowerCase());
      });
    }

    const resultColIndices: { idx: number; headerName: string }[] = [];
    headers.forEach((h, idx) => {
      if (h.includes('result') || h.includes('grade')) {
        resultColIndices.push({ idx, headerName: h });
      }
    });

    const isUniversityResult = resultColIndices.length > 0;

    if (isUniversityResult) {
      const examIdx = headers.findIndex((h) => h.includes('exam') || h.includes('name') || h.includes('title'));
      const subjectIdx = headers.findIndex((h) => h.includes('subject') || h.includes('course') || h.includes('paper') || h.includes('code'));
      
      if (subjectIdx === -1) return;

      $table.find('tbody tr, tr').each((rowIdx, trEl) => {
        const $row = $(trEl);
        if ($row.find('th').length > 0) return;
        if (rowIdx === 0 && $table.find('thead').length === 0) return;

        const cells: string[] = [];
        $row.find('td').each((_, tdEl) => {
          cells.push($(tdEl).text().trim());
        });

        if (cells.length === 0) return;
        const firstCell = cells[0].toLowerCase();
        if (firstCell.includes('no sessional') || firstCell.includes('no results') || firstCell.includes('empty')) {
          return;
        }

        const rawSubject = cells[subjectIdx] || '';
        if (!rawSubject || rawSubject.toLowerCase().includes('no results')) {
          return;
        }

        const { subject, subjectName } = splitSubject(rawSubject);

        let baseExamName = examIdx !== -1 && cells[examIdx] ? cells[examIdx].trim() : '';
        if (!baseExamName) {
          baseExamName = sectionTitle;
        }

        let subjGroup = results.find((r) => r.subject === subject);
        if (!subjGroup) {
          subjGroup = { subject, subjectName, results: [] };
          results.push(subjGroup);
        }

        for (const col of resultColIndices) {
          const grade = cells[col.idx] || '';
          if (!grade || grade === '-' || grade.toLowerCase() === 'nil' || grade.toLowerCase() === 'empty') {
            continue;
          }

          let examName = baseExamName;
          const hName = col.headerName.toLowerCase();
          if (hName.includes('result 2')) {
            examName = `${baseExamName} (Supplementary / Revaluation)`;
          } else if (hName.includes('result 3')) {
            examName = `${baseExamName} (Supplementary 2)`;
          } else if (hName.includes('result 4')) {
            examName = `${baseExamName} (Supplementary 3)`;
          } else if (hName.includes('result 1')) {
            examName = `${baseExamName} (Regular)`;
          } else if (hName.includes('grade') && hName !== 'grade') {
            examName = `${baseExamName} (${col.headerName})`;
          }

          subjGroup.results.push({
            name: examName,
            marks: null,
            total: 0,
            grade,
          });
        }
      });
    } else {
      // Sessional Exam Table
      const subjectIdx = headers.findIndex((h) => h.includes('subject') || h.includes('course') || h.includes('paper') || h.includes('code'));
      const maxMarksIdx = headers.findIndex((h) => h.includes('maximum') || h.includes('max') || h.includes('limit'));
      const marksObtainedIdx = headers.findIndex((h, idx) => 
        idx !== maxMarksIdx && 
        (h.includes('obtained') || h.includes('marks') || h.includes('mark') || h.includes('score'))
      );

      let examNameIdx = headers.findIndex((h) => 
        /exam|assessment|sessional|test|type|description/i.test(h)
      );
      if (examNameIdx === -1) {
        examNameIdx = headers.findIndex((h, idx) =>
          idx !== subjectIdx &&
          idx !== maxMarksIdx &&
          idx !== marksObtainedIdx &&
          !/sl\s*no|semester|view|action/i.test(h) &&
          h.trim().length > 0
        );
      }

      if (subjectIdx === -1 || maxMarksIdx === -1 || marksObtainedIdx === -1) {
        return;
      }

      $table.find('tbody tr, tr').each((rowIdx, trEl) => {
        const $row = $(trEl);
        if ($row.find('th').length > 0) return;
        if (rowIdx === 0 && $table.find('thead').length === 0) return;

        const cells: string[] = [];
        $row.find('td').each((_, tdEl) => {
          cells.push($(tdEl).text().trim());
        });

        if (cells.length === 0) return;
        const firstCell = cells[0].toLowerCase();
        if (firstCell.includes('no sessional') || firstCell.includes('no module') || firstCell.includes('empty')) {
          return;
        }

        const rawSubject = cells[subjectIdx] || '';
        if (!rawSubject || rawSubject.toLowerCase().includes('no results') || rawSubject.toLowerCase().includes('no sessional')) {
          return;
        }

        const { subject, subjectName } = splitSubject(rawSubject);

        const examVal = examNameIdx !== -1 && cells[examNameIdx] ? cells[examNameIdx].trim() : '';
        const examName = cleanExamName(sectionTitle, examVal);

        const maxVal = cells[maxMarksIdx] ? cells[maxMarksIdx].replace(/[^\d.]/g, '') : '';
        const obtainedVal = cells[marksObtainedIdx] ? cells[marksObtainedIdx].trim() : '';

        // Avoid defaulting 0 to 100
        const parsedMax = parseFloat(maxVal);
        const total = isNaN(parsedMax) ? 100 : parsedMax;
        
        let marks: number | null = parseFloat(obtainedVal.replace(/[^\d.]/g, ''));
        let grade = '';

        if (isNaN(marks)) {
          const lowerVal = obtainedVal.toLowerCase();
          if (lowerVal === 'a' || lowerVal === 'ab' || lowerVal === 'absent') {
            marks = 0;
            grade = 'Absent';
          } else {
            marks = null;
          }
        }

        let subjGroup = results.find((r) => r.subject === subject);
        if (!subjGroup) {
          subjGroup = { subject, subjectName, results: [] };
          results.push(subjGroup);
        }

        subjGroup.results.push({
          name: examName,
          marks,
          total,
          grade,
        });
      });
    }
  });

  // Fallback Strategy 2
  if (results.length === 0) {
    const subjectMap = new Map<string, ResultEntry[]>();

    $('table').each((_, tableEl) => {
      const $table = $(tableEl);
      $table.find('tbody tr, tr').each((rowIdx, trEl) => {
        const $row = $(trEl);
        if ($row.find('th').length > 0) return;

        const cells: string[] = [];
        $row.find('td').each((_, tdEl) => {
          cells.push($(tdEl).text().trim());
        });

        if (cells.length < 3) return;
        const subject = cells[0];
        const examName = cells[1];
        if (!subject || !examName) return;

        const obtainedVal = cells[2] ? cells[2].trim() : '';
        const maxVal = cells[3] ? cells[3].replace(/[^\d.]/g, '') : '';

        let marks: number | null = parseFloat(obtainedVal.replace(/[^\d.]/g, ''));
        let grade = cells.length > 4 ? cells[cells.length - 1] : '';

        if (isNaN(marks)) {
          const lowerVal = obtainedVal.toLowerCase();
          if (lowerVal === 'a' || lowerVal === 'ab' || lowerVal === 'absent') {
            marks = 0;
            grade = 'Absent';
          } else {
            marks = null;
          }
        }

        const parsedMax = parseFloat(maxVal);
        const total = isNaN(parsedMax) ? 100 : parsedMax;

        const entry: ResultEntry = {
          name: cleanExamName("", examName),
          marks,
          total,
          grade,
        };

        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, []);
        }
        subjectMap.get(subject)!.push(entry);
      });
    });

    for (const [rawSubject, entries] of subjectMap) {
      const { subject, subjectName } = splitSubject(rawSubject);

      let subjGroup = results.find((r) => r.subject === subject);
      if (!subjGroup) {
        subjGroup = { subject, subjectName, results: [] };
        results.push(subjGroup);
      }
      subjGroup.results.push(...entries);
    }
  }

  return results;
}

// ─── Assignments ────────────────────────────────────────────────────────────

export type AssignmentStatus = 'submitted' | 'pending' | 'overdue' | 'unknown';

export interface Assignment {
  /** Assignment title */
  title: string;
  /** Subject / course name */
  subject: string;
  /** Due date string */
  dueDate: string;
  /** Submission status */
  status: AssignmentStatus;
}

function normalizeAssignmentStatus(raw: string): AssignmentStatus {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('submit')) return 'submitted';
  if (lower.includes('pending') || lower.includes('not submit')) return 'pending';
  if (lower.includes('overdue') || lower.includes('expired') || lower.includes('late')) return 'overdue';
  return 'unknown';
}

/**
 * Parse assignments. Consolidates on Cheerio.
 */
export function parseAssignments(html: string): Assignment[] {
  const results: Assignment[] = [];

  if (html.length > MAX_HTML_LENGTH) {
    throw new Error('HTML payload too large');
  }

  const $ = cheerio.load(html);

  $('table tr').each((_, trEl) => {
    const $row = $(trEl);
    if ($row.find('th').length > 0) return;

    const cells: string[] = [];
    $row.find('td').each((_, tdEl) => {
      cells.push($(tdEl).text().trim());
    });

    if (cells.length < 3) return;

    let dueDate = '';
    let statusCell = '';
    let title = '';
    let subject = '';

    for (const cell of cells) {
      if (!dueDate && /\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/.test(cell)) {
        dueDate = cell;
      } else if (
        !statusCell &&
        /submitted|pending|overdue|not\s*submit|expired|late|completed/i.test(cell)
      ) {
        statusCell = cell;
      }
    }

    const textCells = cells.filter(
      (c) =>
        c !== dueDate &&
        c !== statusCell &&
        isNaN(Number(c.trim())) &&
        c.trim().length > 0
    );

    if (textCells.length >= 2) {
      subject = textCells[0];
      title = textCells[1];
    } else if (textCells.length === 1) {
      title = textCells[0];
    }

    if (!title) return;

    results.push({
      title: title.trim(),
      subject: subject.trim(),
      dueDate: dueDate || 'To be announced',
      status: statusCell ? normalizeAssignmentStatus(statusCell) : 'unknown',
    });
  });

  return results;
}

// ─── Surveys ────────────────────────────────────────────────────────────────

export type SurveyStatus = 'completed' | 'pending' | 'new' | 'unknown';

export interface Survey {
  /** Survey title */
  title: string;
  /** Description or subtitle */
  description: string;
  /** Deadline / due date string */
  deadline: string;
  /** Status */
  status: SurveyStatus;
  /** URL to the survey form (if available) */
  url: string;
}

function normalizeSurveyStatus(raw: string): SurveyStatus {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('complete') || lower.includes('done') || lower.includes('filled')) return 'completed';
  if (lower.includes('pending') || lower.includes('in progress')) return 'pending';
  if (lower.includes('new') || lower.includes('open') || lower.includes('available')) return 'new';
  return 'unknown';
}

/**
 * Parse surveys. Consolidates on Cheerio and maps links directly inside each row.
 */
export function parseSurveys(html: string): Survey[] {
  const results: Survey[] = [];

  if (html.length > MAX_HTML_LENGTH) {
    throw new Error('HTML payload too large');
  }

  const $ = cheerio.load(html);

  // Strategy 1: Table-based
  $('table tr').each((_, trEl) => {
    const $row = $(trEl);
    if ($row.find('th').length > 0) return;

    const cells: string[] = [];
    $row.find('td').each((_, tdEl) => {
      cells.push($(tdEl).text().trim());
    });

    if (cells.length < 2) return;

    let title = '';
    let statusText = '';
    let deadline = '';
    let url = '';

    // Extract link URL directly from the same <tr> element
    const $link = $row.find('a[href]');
    if ($link.length > 0) {
      const href = $link.attr('href') || '';
      if (href) {
        url = href.startsWith('http') ? href : `https://gcek.etlab.in${href}`;
      }
    }

    for (const cell of cells) {
      if (!deadline && /\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/.test(cell)) {
        deadline = cell;
      } else if (
        !statusText &&
        /completed|pending|new|open|done|filled|available|not\s*filled/i.test(cell)
      ) {
        statusText = cell;
      }
    }

    const textCells = cells.filter(
      (c) =>
        c !== deadline &&
        c !== statusText &&
        isNaN(Number(c.trim())) &&
        c.trim().length > 0
    );

    if (textCells.length >= 1) {
      title = textCells[0];
    }

    if (!title) return;

    results.push({
      title: title.trim(),
      description: textCells.length >= 2 ? textCells[1].trim() : '',
      deadline: deadline || '',
      status: statusText ? normalizeSurveyStatus(statusText) : 'unknown',
      url,
    });
  });

  // Strategy 2: Card/link-based layout
  if (results.length === 0) {
    $('a[href*="survey"], a[href*="Survey"]').each((_, aEl) => {
      const $a = $(aEl);
      const surveyUrl = $a.attr('href') || '';
      const linkText = $a.text().trim();
      if (linkText && linkText.length > 2) {
        results.push({
          title: linkText,
          description: '',
          deadline: '',
          status: 'unknown',
          url: surveyUrl.startsWith('http') ? surveyUrl : `https://gcek.etlab.in${surveyUrl}`,
        });
      }
    });
  }

  return results;
}

// ─── Login page detection ───────────────────────────────────────────────────

/**
 * Detect if the given HTML is actually the ETLAB login page.
 */
export function isLoginPage(html: string): boolean {
  return (
    html.includes('LoginForm[username]') ||
    html.includes('LoginForm[password]') ||
    html.includes('id="loginForm"')
  );
}

// ─── Timetable (weekly grid) ───────────────────────────────────────────────

export interface TimetableCell {
  subject: string;
  type: string; 
  teacher?: string;
  classType: 'TR' | 'PR' | 'EL' | 'TL' | 'FP' | 'DR' | 'MIN' | '';
}

export interface TimetableDay {
  day: string; 
  periods: TimetableCell[];
}

export interface PeriodHeader {
  index: number;
  label: string;
  timeSlot?: string;
}

export interface TimetableData {
  periods: PeriodHeader[];
  days: TimetableDay[];
}

/**
 * Parse timetable page using Cheerio.
 */
export function parseTimetable(html: string): TimetableData {
  const $ = cheerio.load(html);
  const data: TimetableData = {
    periods: [],
    days: [],
  };

  $('#timetable table thead tr th').each((idx, el) => {
    if (idx === 0) return;
    const rawText = $(el).text().trim();
    
    const cleanText = rawText.replace(/\s+/g, ' ');
    const timeMatch = cleanText.match(/(Period\s+\d+)\s*(?:\[\s*([^\]]+)\s*\])?/i);
    
    if (timeMatch) {
      data.periods.push({
        index: idx,
        label: timeMatch[1].trim(),
        timeSlot: timeMatch[2] ? timeMatch[2].replace(/\s+/g, '').replace('--', ' - ').replace('-', ' - ') : undefined,
      });
    } else {
      data.periods.push({
        index: idx,
        label: `Period ${idx}`,
      });
    }
  });

  $('#timetable table tbody tr').each((_, trEl) => {
    const $row = $(trEl);
    const dayName = $row.find('td').first().text().trim();
    if (!dayName) return;

    const periods: TimetableCell[] = [];

    $row.find('td').each((tdIdx, tdEl) => {
      if (tdIdx === 0) return; 
      const $td = $(tdEl);
      const className = ($td.attr('class') || '').toUpperCase().trim();
      
      const parts: string[] = [];
      $td.contents().each((_, node) => {
        if (node.type === 'text') {
          const text = $(node).text().trim();
          if (text) parts.push(text);
        } else {
          const text = $(node).text().trim();
          if (text) parts.push(text);
        }
      });

      let subject = '';
      let type = '';
      let teacher = '';

      if (parts.length > 0) {
        subject = parts[0];
        if (parts.length > 1) {
          if (parts[1].startsWith('[') && parts[1].endsWith(']')) {
            type = parts[1].replace(/[\[\]]/g, '').trim();
            if (parts.length > 2) {
              teacher = parts.slice(2).join(' ');
            }
          } else {
            teacher = parts.slice(1).join(' ');
          }
        }
      }

      let classType: TimetableCell['classType'] = '';
      if (className.includes('TR')) classType = 'TR';
      else if (className.includes('PR')) classType = 'PR';
      else if (className.includes('EL')) classType = 'EL';
      else if (className.includes('TL')) classType = 'TL';
      else if (className.includes('FP')) classType = 'FP';
      else if (className.includes('DR')) classType = 'DR';
      else if (className.includes('MIN')) classType = 'MIN';

      if (!subject) {
        if (classType === 'FP') {
          subject = 'Free Period';
        } else if (classType === 'MIN') {
          subject = 'Free Period / Mini Project';
        } else {
          subject = 'Free Period';
        }
      }

      periods.push({
        subject,
        type: type || (classType === 'TR' ? 'Theory' : classType === 'PR' ? 'Practical' : classType === 'EL' ? 'Elective' : classType === 'TL' ? 'Tutorial' : ''),
        teacher: teacher || undefined,
        classType,
      });
    });

    data.days.push({
      day: dayName,
      periods,
    });
  });

  return data;
}
