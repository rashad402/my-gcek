import { dataCache } from './data-cache';

const staticMap: Record<string, string> = {
  // Common GCEK upper semester subjects
  'CST302': 'Compiler Design',
  'HUT300': 'Industrial Economics & Foreign Trade',
  'CST304': 'Computer Graphics & Image Processing',
  'CST306': 'Algorithm Analysis & Design',
  'CST308': 'Comprehensive Course Work',
  'CSL332': 'Networking Lab',
  'CSD334': 'Miniproject',
  'CST362': 'Programming in Python',

  // First-year subjects (Semester 1)
  'MAT101': 'Linear Algebra And Calculus',
  'PHT100': 'Engineering Physics A',
  'CYT100': 'Engineering Chemistry',
  'EST100': 'Engineering Mechanics',
  'EST110': 'Engineering Graphics',
  'EST120': 'Basics Of Civil & Mechanical Engineering',
  'EST130': 'Basics Of Electrical & Electronics Engineering',
  'HUN101': 'Life Skills',
  'PHL120': 'Engineering Physics Lab',
  'CYL120': 'Engineering Chemistry Lab',
  'ESL120': 'Civil & Mechanical Workshop',
  'ESL130': 'Electrical & Electronics Workshop',

  // First-year subjects (Semester 2)
  'MAT102': 'Vector Calculus, Differential Equations And Transforms',
  'HUN102': 'Professional Communication',
  'EST102': 'Programming In C',

  // Second-year subjects (Semester 3)
  'MAT203': 'Discrete Mathematical Structures',
  'CST201': 'Data Structures',
  'CST203': 'Logic System Design',
  'CST205': 'Object Oriented Programming Using Java',
  'EST200': 'Design And Engineering',
  'HUT200': 'Professional Ethics',
  'MCN201': 'Sustainable Engineering',
  'CSL201': 'Data Structures Lab',
  'CSL203': 'Object Oriented Programming Lab (In Java)',

  // Second-year subjects (Semester 4)
  'MAT206': 'Graph Theory',
  'CST202': 'Computer Organisation And Architecture',
  'CST204': 'Database Management Systems',
  'CST206': 'Operating Systems',
  'MCN202': 'Constitution Of India',
  'CSL202': 'Digital Lab',
  'CSL204': 'Operating Systems Lab',
};

/**
 * Resolves a course code/name to its full user-friendly name.
 * Searches the dynamic results cache first, falling back to a static map of standard GCEK courses.
 */
export function getSubjectName(subject: string): string {
  const match = subject.match(/[A-Z]{2,4}\d{2,4}[A-Z]?/i);
  const cleanCode = match ? match[0].toUpperCase() : subject.trim().toUpperCase();

  // 1. Try to find in dynamic results cache
  if (dataCache.results) {
    const found = dataCache.results.find(r => {
      const rMatch = r.subject.match(/[A-Z]{2,4}\d{2,4}[A-Z]?/i);
      const rCode = rMatch ? rMatch[0].toUpperCase() : r.subject.trim().toUpperCase();
      return rCode === cleanCode;
    });
    if (found && found.subjectName) {
      return found.subjectName;
    }
  }

  // 2. Fall back to static map
  return staticMap[cleanCode] || subject;
}
