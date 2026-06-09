/**
 * ETLAB HTML Parser
 *
 * Pure functions that convert raw ETLAB HTML pages into the TypeScript
 * data structures used by the app's UI screens.
 *
 * Uses regex-based parsing (zero dependencies). If parsing becomes
 * fragile, `fast-html-parser` can be added as a fallback.
 */

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Strip all HTML tags from a string. */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

/** Decode common HTML entities. */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Extract all <th> header contents from an HTML table. */
function extractTableHeaders(html: string): string[] {
  const headers: string[] = [];
  const theadMatch = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  if (!theadMatch) return headers;

  const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  let thMatch: RegExpExecArray | null;
  while ((thMatch = thRegex.exec(theadMatch[1])) !== null) {
    headers.push(decodeEntities(stripTags(thMatch[1])));
  }
  return headers;
}

/** Extract all <tr> row contents from an HTML table body. */
function extractTableRows(html: string): string[][] {
  const rows: string[][] = [];
  // Match each <tr>...</tr>
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    // Skip header rows
    if (/<th[\s>]/i.test(rowHtml)) continue;
    // Extract <td> contents
    const cells: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      cells.push(decodeEntities(stripTags(tdMatch[1])));
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  return rows;
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
 *
 * Expected table columns (may vary):
 *   Sl.No | Subject | Total Hours | Hours Present | Hours Absent | Percentage
 * or similar variations.
 */
export function parseAttendance(html: string): SubjectAttendance[] {
  const results: SubjectAttendance[] = [];
  const headers = extractTableHeaders(html);
  
  // Check if this is the horizontal attendance grid (student row with subject columns)
  const isHorizontal = headers.some(h => /reg\s*no|roll\s*no|name/i.test(h));
  
  if (isHorizontal) {
    const rows = extractTableRows(html);
    if (rows.length === 0) return results;
    
    // Take the first row (the logged-in student's row)
    const cells = rows[0];
    
    // Map headers to cells
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].trim();
      
      // Skip metadata and totals columns
      if (/reg\s*no|roll\s*no|name|total|percentage/i.test(header) || !header) {
        continue;
      }
      
      const cellVal = cells[i] ? cells[i].trim() : '';
      if (!cellVal) continue;
      
      // Parse "Attended/Total (Percentage%)" - e.g. "45/47 (96%)"
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
    return results;
  }

  // Fallback to original vertical parser
  const rows = extractTableRows(html);

  for (const cells of rows) {
    if (cells.length < 3) continue;

    let subject = '';
    let total = 0;
    let attended = 0;
    let percentage = 0;

    const nums: number[] = [];
    let subjectIdx = -1;

    for (let i = 0; i < cells.length; i++) {
      const val = cells[i].replace(/[%\s]/g, '');
      const num = parseFloat(val);
      if (!isNaN(num) && val === String(num)) {
        nums.push(num);
      } else if (subjectIdx === -1 && cells[i].length > 1 && isNaN(Number(cells[i]))) {
        // First non-trivial non-numeric cell = subject name
        subjectIdx = i;
        subject = cells[i];
      }
    }

    if (!subject || nums.length < 2) continue;

    // Interpret numbers based on count
    if (nums.length >= 4) {
      // [slNo, total, present, absent, percentage] or [total, present, absent, percentage]
      // Take the last 4 numbers: total, present, absent, percentage
      const tail = nums.slice(-4);
      total = tail[0];
      attended = tail[1];
      // tail[2] = absent (skip)
      percentage = tail[3];
    } else if (nums.length === 3) {
      // [total, present, percentage]
      total = nums[0];
      attended = nums[1];
      percentage = nums[2];
    } else if (nums.length === 2) {
      // [present, total] or [percentage, total] — heuristic
      if (nums[1] > nums[0]) {
        attended = nums[0];
        total = nums[1];
        percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
      } else {
        total = nums[0];
        percentage = nums[1];
        attended = total > 0 ? Math.round((percentage / 100) * total) : 0;
      }
    }

    // Ensure percentage is sane
    if (percentage > 100) percentage = 100;
    if (percentage < 0) percentage = 0;

    results.push({
      subject: subject.trim(),
      professor: '', // ETLAB attendance tables typically don't include professor names
      percentage: Math.round(percentage * 10) / 10,
      attended,
      total,
    });
  }

  return results;
}

// ─── Results ────────────────────────────────────────────────────────────────

export interface ResultEntry {
  /** Exam / assessment name (e.g., "Series 1", "Internal") */
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

/** Map raw exam/sessional names like "Result 1" or sessional indices to user-friendly names like "Regular" or "Series 1". */
function cleanExamName(sectionTitle: string, examVal: string): string {
  const sec = sectionTitle.trim();
  const secLower = sec.toLowerCase();
  const val = examVal.trim();
  const valLower = val.toLowerCase();

  // If the exam value is just a number (e.g. "1", "2")
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
    // Fallback if it's just a number
    return `${sec} ${num}`;
  }

  // Handle "Result 1", "Result 2" text format
  if (valLower === 'result 1') return 'Regular';
  if (valLower === 'result 2') return 'Supplementary / Revaluation';
  if (valLower === 'result 3') return 'Supplementary 2';
  if (valLower === 'result 4') return 'Supplementary 3';

  // General fallback
  if (val) {
    if (secLower.includes(valLower)) return sec;
    return sec ? `${sec} - ${val}` : val;
  }
  return sec;
}

/**
 * Parse the ETLAB results page HTML.
 *
 * The results page may have:
 * - A single large table with all subjects and exams
 * - Multiple tables per subject
 * - Or a card/section layout
 *
 * We try multiple strategies to extract structured data.
 */
export function parseResults(html: string): SubjectResult[] {
  const results: SubjectResult[] = [];

  // Match <h2> to <h6> or <caption> headers followed by a <table>
  const titleAndTableRegex = /<(h[2-6]|caption)[^>]*>\s*([\s\S]*?)\s*<\/\1>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/gi;
  let match: RegExpExecArray | null;

  while ((match = titleAndTableRegex.exec(html)) !== null) {
    const sectionTitle = decodeEntities(stripTags(match[2])).trim();
    const tableHtml = match[3];

    // 1. Extract headers to find column mappings
    const headers: string[] = [];
    const theadMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
    if (theadMatch) {
      const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
      let thMatch: RegExpExecArray | null;
      while ((thMatch = thRegex.exec(theadMatch[1])) !== null) {
        headers.push(decodeEntities(stripTags(thMatch[1])).toLowerCase());
      }
    }

    // Find all Result/Grade columns
    const resultColIndices: { idx: number; headerName: string }[] = [];
    headers.forEach((h, idx) => {
      if (h.includes('result') || h.includes('grade')) {
        resultColIndices.push({ idx, headerName: h });
      }
    });

    const isUniversityResult = resultColIndices.length > 0;

    // A. Parse as University Result if it has grade/result columns
    if (isUniversityResult) {
      const examIdx = headers.findIndex((h) => h.includes('exam') || h.includes('name') || h.includes('title'));
      const subjectIdx = headers.findIndex((h) => h.includes('subject') || h.includes('course') || h.includes('paper') || h.includes('code'));
      
      if (subjectIdx === -1) continue;

      const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
      const searchArea = tbodyMatch ? tbodyMatch[1] : tableHtml;

      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch: RegExpExecArray | null;

      while ((trMatch = trRegex.exec(searchArea)) !== null) {
        const rowHtml = trMatch[1];
        if (/<th[\s>]/i.test(rowHtml)) continue;

        const cells: string[] = [];
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdMatch: RegExpExecArray | null;
        while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
          cells.push(decodeEntities(stripTags(tdMatch[1])).trim());
        }

        if (cells.length === 0 || cells[0].includes('No sessional') || cells[0].includes('No results') || cells[0].includes('empty')) {
          continue;
        }

        const rawSubject = cells[subjectIdx] || '';
        if (!rawSubject || rawSubject.toLowerCase().includes('no results')) {
          continue;
        }

        const subjectParts = rawSubject.split('-');
        const subject = subjectParts[0].trim();
        const subjectName = subjectParts[1] ? subjectParts[1].trim() : '';

        // Base exam name (e.g. "B.Tech S6 Exam May 2025")
        let baseExamName = examIdx !== -1 && cells[examIdx] ? cells[examIdx].trim() : '';
        if (!baseExamName) {
          baseExamName = sectionTitle;
        }

        let subjGroup = results.find((r) => r.subject === subject);
        if (!subjGroup) {
          subjGroup = { subject, subjectName, results: [] };
          results.push(subjGroup);
        }

        // For each result/grade column
        for (const col of resultColIndices) {
          const grade = cells[col.idx] || '';
          // Skip if empty or hyphen (meaning no grade/not registered for supplementary)
          if (!grade || grade === '-' || grade.toLowerCase() === 'nil' || grade.toLowerCase() === 'empty') {
            continue;
          }

          // Format name based on header (Result 1 -> Regular, Result 2 -> Supplementary, etc.)
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
      }
      continue;
    }

    // Find column indices with highly robust rules
    const subjectIdx = headers.findIndex((h) => h.includes('subject') || h.includes('course') || h.includes('paper') || h.includes('code'));
    const maxMarksIdx = headers.findIndex((h) => h.includes('maximum') || h.includes('max') || h.includes('limit'));
    const marksObtainedIdx = headers.findIndex((h, idx) => 
      idx !== maxMarksIdx && 
      (h.includes('obtained') || h.includes('marks') || h.includes('mark') || h.includes('score'))
    );

    // Find exam/assessment name column (excluding subject, max marks, marks obtained, semester, view response)
    const examNameIdx = headers.findIndex((h, idx) =>
      idx !== subjectIdx &&
      idx !== maxMarksIdx &&
      idx !== marksObtainedIdx &&
      !h.includes('semester') &&
      !h.includes('view') &&
      h.trim().length > 0
    );

    if (subjectIdx === -1 || maxMarksIdx === -1 || marksObtainedIdx === -1) {
      // Table doesn't match a standard results table layout
      continue;
    }

    // B. Parse as Sessional Exam Table
    const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    const searchArea = tbodyMatch ? tbodyMatch[1] : tableHtml;

    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch: RegExpExecArray | null;

    while ((trMatch = trRegex.exec(searchArea)) !== null) {
      const rowHtml = trMatch[1];
      if (/<th[\s>]/i.test(rowHtml)) continue;

      const cells: string[] = [];
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tdMatch: RegExpExecArray | null;
      while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
        cells.push(decodeEntities(stripTags(tdMatch[1])));
      }

      if (cells.length === 0 || cells[0].includes('No sessional') || cells[0].includes('No module') || cells[0].includes('empty')) {
        continue;
      }

      const rawSubject = cells[subjectIdx] || '';
      if (!rawSubject || rawSubject.toLowerCase().includes('no results') || rawSubject.toLowerCase().includes('no sessional')) {
        continue;
      }

      // Clean subject code (e.g. "CST302 - COMPILER DESIGN" -> "CST302" and "COMPILER DESIGN")
      const subjectParts = rawSubject.split('-');
      const subject = subjectParts[0].trim();
      const subjectName = subjectParts[1] ? subjectParts[1].trim() : '';

      // Determine assessment title
      const examVal = examNameIdx !== -1 && cells[examNameIdx] ? cells[examNameIdx].trim() : '';
      const examName = cleanExamName(sectionTitle, examVal);

      // Parse marks
      const maxVal = cells[maxMarksIdx] ? cells[maxMarksIdx].replace(/[^\d.]/g, '') : '';
      const obtainedVal = cells[marksObtainedIdx] ? cells[marksObtainedIdx].trim() : '';

      const total = parseFloat(maxVal) || 100;
      let marks: number | null = parseFloat(obtainedVal.replace(/[^\d.]/g, ''));
      let grade = '';

      if (isNaN(marks)) {
        const lowerVal = obtainedVal.toLowerCase();
        if (lowerVal === 'a' || lowerVal === 'ab' || lowerVal === 'absent') {
          marks = 0;
          grade = 'Absent';
        } else {
          // If no marks have been entered yet, keep it as null
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
    }
  }

  // Fallback: If Strategy 1 parsed nothing, try Strategy 2 (single table with subject column)
  if (results.length === 0) {
    const rows = extractTableRows(html);
    const subjectMap = new Map<string, ResultEntry[]>();

    for (const cells of rows) {
      if (cells.length < 3) continue;
      const subject = cells[0];
      const examName = cells[1];
      if (!subject || !examName) continue;

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

      const total = parseFloat(maxVal) || 100;

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
    }

    for (const [rawSubject, entries] of subjectMap) {
      const subjectParts = rawSubject.split('-');
      const subject = subjectParts[0].trim();
      const subjectName = subjectParts[1] ? subjectParts[1].trim() : '';

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
 * Parse the ETLAB assignments page HTML.
 *
 * Expected table columns:
 *   Sl.No | Subject | Assignment Title | Due Date | Status | ...
 */
export function parseAssignments(html: string): Assignment[] {
  const results: Assignment[] = [];
  const rows = extractTableRows(html);

  for (const cells of rows) {
    if (cells.length < 3) continue;

    // Find cells that look like a date
    let dueDate = '';
    let statusCell = '';
    let title = '';
    let subject = '';

    for (const cell of cells) {
      // Date pattern: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, or text dates
      if (!dueDate && /\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/.test(cell)) {
        dueDate = cell;
      }
      // Status keywords
      else if (
        !statusCell &&
        /submitted|pending|overdue|not\s*submit|expired|late|completed/i.test(cell)
      ) {
        statusCell = cell;
      }
    }

    // For remaining text cells (non-numeric, non-date, non-status), assign to subject/title
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

    if (!title) continue;

    results.push({
      title: title.trim(),
      subject: subject.trim(),
      dueDate: dueDate || 'To be announced',
      status: statusCell ? normalizeAssignmentStatus(statusCell) : 'unknown',
    });
  }

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
 * Parse the ETLAB surveys page HTML.
 *
 * Survey pages may use:
 * - A table layout with columns: Title, Status, Deadline, Action
 * - A card/list layout with survey items
 */
export function parseSurveys(html: string): Survey[] {
  const results: Survey[] = [];

  // Strategy 1: Table-based
  const rows = extractTableRows(html);
  if (rows.length > 0) {
    // Find all <tr> tags to correlate with the rows
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const trContents: string[] = [];
    let trMatch: RegExpExecArray | null;
    while ((trMatch = trRegex.exec(html)) !== null) {
      const rowHtml = trMatch[1];
      if (/<th[\s>]/i.test(rowHtml)) continue;
      trContents.push(rowHtml);
    }

    for (let idx = 0; idx < rows.length; idx++) {
      const cells = rows[idx];
      if (cells.length < 2) continue;

      let title = '';
      let statusText = '';
      let deadline = '';
      let url = '';

      // Extract URL from original tr HTML if available
      const trHtml = trContents[idx];
      if (trHtml) {
        const hrefMatch = trHtml.match(/href\s*=\s*["']([^"']+)["']/i);
        if (hrefMatch) {
          const href = hrefMatch[1];
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

      if (!title) continue;

      results.push({
        title: title.trim(),
        description: textCells.length >= 2 ? textCells[1].trim() : '',
        deadline: deadline || '',
        status: statusText ? normalizeSurveyStatus(statusText) : 'unknown',
        url,
      });
    }
  }

  // Strategy 2: Card/link-based layout
  if (results.length === 0) {
    // Look for links with survey-related hrefs
    const linkRegex = /<a[^>]*href\s*=\s*["']([^"']*survey[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const surveyUrl = linkMatch[1];
      const linkText = decodeEntities(stripTags(linkMatch[2])).trim();
      if (linkText && linkText.length > 2) {
        results.push({
          title: linkText,
          description: '',
          deadline: '',
          status: 'unknown',
          url: surveyUrl.startsWith('http') ? surveyUrl : `https://gcek.etlab.in${surveyUrl}`,
        });
      }
    }
  }

  return results;
}

// ─── Login page detection ───────────────────────────────────────────────────

/**
 * Detect if the given HTML is actually the ETLAB login page,
 * indicating the session has expired.
 */
export function isLoginPage(html: string): boolean {
  return (
    html.includes('LoginForm[username]') ||
    html.includes('LoginForm[password]') ||
    html.includes('id="loginForm"')
  );
}
