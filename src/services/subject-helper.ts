import { dataCache } from './data-cache';

const staticMap: Record<string, string> = {
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

  // Third-year subjects (Semester 5)
  'CST301': 'Formal Languages And Automata Theory',
  'CST303': 'Computer Networks',
  'CST305': 'System Software',
  'CST307': 'Microprocessors And Microcontrollers',
  'CST309': 'Management Of Software Systems',
  'MCN301': 'Disaster Management',
  'CSL331': 'System Software And Microprocessors Lab',
  'CSL333': 'Database Management Systems Lab',

  // Third-year subjects (Semester 6)
  'CST302': 'Compiler Design',
  'CST304': 'Computer Graphics And Image Processing',
  'CST306': 'Algorithm Analysis And Design',
  'HUT300': 'Industrial Economics And Foreign Trade',
  'CST308': 'Comprehensive Course Work',
  'CSL332': 'Networking Lab',
  'CSD334': 'Miniproject',

  // Fourth-year Electives (Semester 7/8)
  'CST413': 'Machine Learning',
  'CST423': 'Cloud Computing',
  'CST433': 'Security In Computing',
  'CST443': 'Model Based Software Development',
  'CST453': 'Advanced Topics In Ia32 Architecture',
  'CST463': 'Web Programming',
  'CST473': 'Natural Language Processing',

  'CST415': 'Introduction To Mobile Computing',
  'CST425': 'Introduction To Deep Learning',
  'CST435': 'Computer Graphics',
  'CST445': 'Python For Engineers',
  'CST455': 'Object Oriented Concepts',

  'CST414': 'Deep Learning',
  'CST424': 'Programming Paradigms',
  'CST434': 'Cryptography',
  'CST444': 'Soft Computing',
  'CST454': 'Fuzzy Set Theory And Applications',
  'CST464': 'Embedded Systems',
  'CST474': 'Computer Vision',

  'CST416': 'Formal Methods And Tools In Software Engineering',
  'CST426': 'Client Server Architecture',
  'CST436': 'Parallel Computing',
  'CST446': 'Data Compression Techniques',
  'CST456': 'Unified Extended Firmware Interface',
  'CST466': 'Data Mining',
  'CST476': 'Mobile Computing',

  'CST418': 'High Performance Computing',
  'CST428': 'Block Chain Technologies',
  'CST438': 'Image Processing Technique',
  'CST448': 'Internet Of Things',
  'CST458': 'Software Testing',
  'CST468': 'Bioinformatics',
  'CST478': 'Computational Linguistics',
  
  // Fourth-year Core (Semester 7/8)
  'CST401': 'Artificial Intelligence',
  'MCN401': 'Industrial Safety Engineering',
  'CSL411': 'Compiler Lab',
  'CSQ413': 'Seminar',
  'CSD415': 'Project Phase I',

  'CST402': 'Distributed Computing',
  'CST404': 'Comprehensive Course Viva',
  'CSD416': 'Project Phase II',
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
