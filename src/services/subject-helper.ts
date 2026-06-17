import { dataCache } from './data-cache';

const staticMap: Record<string, string> = {
  // =========================================================================
  // 🏛️ APJ ABDUL KALAM TECHNOLOGICAL UNIVERSITY (KTU) 2019 SCHEME
  // =========================================================================

  // ─── First Year Common (S1 & S2) ─────────────────────────────────────────
  'MAT101': 'Linear Algebra And Calculus',
  'PHT100': 'Engineering Physics A',
  'CYT100': 'Engineering Chemistry',
  'EST100': 'Engineering Mechanics',
  'EST110': 'Engineering Graphics',
  'EST120': 'Basics of Civil & Mechanical Engineering',
  'EST130': 'Basics of Electrical & Electronics Engineering',
  'HUN101': 'Life Skills',
  'PHL120': 'Engineering Physics Lab',
  'CYL120': 'Engineering Chemistry Lab',
  'ESL120': 'Civil & Mechanical Workshop',
  'ESL130': 'Electrical & Electronics Workshop',
  'MAT102': 'Vector Calculus, Differential Equations and Transforms',
  'HUN102': 'Professional Communication',
  'EST102': 'Programming in C',

  // ─── Common Core & Humanities (S3 - S8) ──────────────────────────────────
  'EST200': 'Design and Engineering',
  'HUT200': 'Professional Ethics',
  'MCN201': 'Sustainable Engineering',
  'MCN202': 'Constitution of India',
  'MCN301': 'Disaster Management',
  'HUT300': 'Industrial Economics and Foreign Trade',
  'HUT310': 'Management for Engineers',
  'MCN401': 'Industrial Safety Engineering',

  // ─── Semester-wise Mathematics ──────────────────────────────────────────
  'MAT201': 'Partial Differential Equations and Complex Fourier Series',
  'MAT202': 'Probability, Statistics and Numerical Methods',
  'MAT203': 'Discrete Mathematical Structures',
  'MAT204': 'Probability, Random Processes and Numerical Methods',
  'MAT206': 'Graph Theory',
  'MAT208': 'Probability, Statistics and Numerical Methods',

  // ─── Computer Science & Engineering (CSE) ────────────────────────────────
  'CST201': 'Data Structures',
  'CST202': 'Computer Organisation and Architecture',
  'CST203': 'Logic System Design',
  'CST204': 'Database Management Systems',
  'CST205': 'Object Oriented Programming using Java',
  'CST206': 'Operating Systems',
  'CSL201': 'Data Structures Lab',
  'CSL202': 'Digital Lab',
  'CSL203': 'Object Oriented Programming Lab (in Java)',
  'CSL204': 'Operating Systems Lab',
  'CST301': 'Formal Languages and Automata Theory',
  'CST302': 'Compiler Design',
  'CST303': 'Computer Networks',
  'CST304': 'Computer Graphics and Image Processing',
  'CST305': 'System Software',
  'CST306': 'Algorithm Analysis and Design',
  'CST307': 'Microprocessors and Microcontrollers',
  'CST308': 'Comprehensive Course Work',
  'CST309': 'Management of Software Systems',
  'CSL331': 'System Software and Microprocessors Lab',
  'CSL332': 'Networking Lab',
  'CSL333': 'Database Management Systems Lab',
  'CSD334': 'Miniproject',
  'CST401': 'Artificial Intelligence',
  'CST402': 'Distributed Computing',
  'CST404': 'Comprehensive Course Viva',
  'CSL411': 'Compiler Lab',
  'CSQ413': 'Seminar',
  'CSD415': 'Project Phase I',
  'CSD416': 'Project Phase II',

  // ─── Electronics & Communication Engineering (ECE) ───────────────────────
  'ECT201': 'Solid State Devices',
  'ECT202': 'Analog Circuits',
  'ECT203': 'Logic Circuit Design',
  'ECT204': 'Signals and Systems',
  'ECT205': 'Network Theory',
  'ECT206': 'Computer Architecture and Microcontrollers',
  'ECL201': 'Scientific Computing Lab',
  'ECL202': 'Analog Circuits and Simulation Lab',
  'ECL203': 'Logic Design Lab',
  'ECL204': 'Microcontroller Lab',
  'ECT301': 'Linear Integrated Circuits',
  'ECT302': 'Electromagnetics',
  'ECT303': 'Digital Signal Processing',
  'ECT304': 'VLSI Design',
  'ECT305': 'Analog and Digital Communication',
  'ECT306': 'Information Theory and Coding',
  'ECT307': 'Control Systems',
  'ECL331': 'Analog Integrated Circuits and Simulation Lab',
  'ECL332': 'Communication Lab',
  'ECL333': 'Digital Signal Processing Lab',
  'ECD334': 'Miniproject',
  'ECT401': 'Microwaves and Antennas',
  'ECT402': 'Instrumentation',
  'ECT404': 'Comprehensive Viva',
  'ECL411': 'Microwave and Optical Communication Lab',
  'ECQ413': 'Seminar',
  'ECD415': 'Project Phase I',
  'ECD416': 'Project Phase II',

  // ─── Electrical & Electronics Engineering (EEE) ─────────────────────────
  'EET201': 'Circuits and Networks',
  'EET202': 'DC Machines and Transformers',
  'EET203': 'Measurements and Instrumentation',
  'EET204': 'Electromagnetic Theory',
  'EET205': 'Analog Electronics',
  'EET206': 'Digital Electronics',
  'EEL201': 'Circuits and Measurements Lab',
  'EEL202': 'Electrical Machines Lab I',
  'EEL203': 'Electronic Circuits Lab',
  'EEL204': 'Digital Electronics Lab',
  'EET301': 'Power Systems I',
  'EET302': 'Linear Control Systems',
  'EET303': 'Microprocessors and Microcontrollers',
  'EET304': 'Power Systems II',
  'EET305': 'Signals and Systems',
  'EET306': 'Power Electronics',
  'EET307': 'Synchronous and Induction Machines',
  'EEL331': 'Microprocessors and Microcontrollers Lab',
  'EEL332': 'Power Systems Lab',
  'EEL333': 'Electrical Machines Lab II',
  'EED334': 'Miniproject',
  'EET401': 'Advanced Control Systems',
  'EET402': 'Electrical System Design and Estimation',
  'EET404': 'Comprehensive Viva',
  'EEL411': 'Control Systems Lab',
  'EEQ413': 'Seminar',
  'EED415': 'Project Phase I',
  'EED416': 'Project Phase II',

  // ─── Mechanical Engineering (ME) ─────────────────────────────────────────
  'MET201': 'Mechanics of Solids',
  'MET202': 'Engineering Thermodynamics',
  'MET203': 'Mechanics of Fluids',
  'MET204': 'Manufacturing Process',
  'MET205': 'Metallurgy and Material Science',
  'MET206': 'Fluid Machinery',
  'MEL201': 'Computer Aided Machine Drawing',
  'MEL202': 'Materials Testing Lab',
  'MEL203': 'Fluid Mechanics and Machinery Lab',
  'MEL204': 'Machine Tools Lab I',
  'MET301': 'Mechanics of Machinery',
  'MET302': 'Heat and Mass Transfer',
  'MET303': 'Thermal Engineering',
  'MET304': 'Dynamics and Design of Machinery',
  'MET305': 'Industrial and Systems Engineering',
  'MET306': 'Advanced Manufacturing Engineering',
  'MET307': 'Machine Tools and Metrology',
  'MEL331': 'Machine Tools Lab II',
  'MEL332': 'Thermal Engineering Lab',
  'MEL333': 'Metrology and Instrumentation Lab',
  'MED334': 'Miniproject',
  'MET401': 'Design of Transmission Systems',
  'MET402': 'Mechatronics',
  'MET404': 'Comprehensive Viva',
  'MEL411': 'Mechanical Engineering Lab',
  'MEQ413': 'Seminar',
  'MED415': 'Project Phase I',
  'MED416': 'Project Phase II',

  // ─── Civil Engineering (CE) ──────────────────────────────────────────────
  'CET201': 'Mechanics of Solids',
  'CET202': 'Engineering Geology',
  'CET203': 'Fluid Mechanics and Hydraulics',
  'CET204': 'Geotechnical Engineering I',
  'CET205': 'Surveying and Geomatics',
  'CET206': 'Transportation Engineering',
  'CEL201': 'Civil Engineering Planning and Drafting Lab',
  'CEL202': 'Material Testing Lab I',
  'CEL203': 'Surveying Lab',
  'CEL204': 'Transportation Engineering Lab',
  'CET301': 'Structural Analysis I',
  'CET302': 'Structural Analysis II',
  'CET303': 'Design of Concrete Structures',
  'CET304': 'Environmental Engineering',
  'CET305': 'Geotechnical Engineering II',
  'CET306': 'Design of Hydraulic Structures',
  'CET307': 'Hydrology and Water Resources Engineering',
  'CET309': 'Construction Technology and Management',
  'CEL331': 'Material Testing Lab II',
  'CEL332': 'Environmental Engineering Lab',
  'CEL333': 'Geotechnical Engineering Lab',
  'CED334': 'Miniproject',
  'CET401': 'Design of Steel Structures',
  'CET402': 'Quantity Surveying and Valuation',
  'CET404': 'Comprehensive Viva',
  'CEL411': 'Environmental Engineering Lab II',
  'CEQ413': 'Seminar',
  'CED415': 'Project Phase I',
  'CED416': 'Project Phase II',


  // =========================================================================
  // 🏛️ APJ ABDUL KALAM TECHNOLOGICAL UNIVERSITY (KTU) 2024 SCHEME
  // =========================================================================

  // ─── First Year Common & Group S1/S2 Courses ─────────────────────────────
  'GAMAT101': 'Mathematics for Information Science-1',
  'GBMAT101': 'Mathematics for Electrical Science-1',
  'GCMAT101': 'Mathematics for Physical Science-1',
  'GDMAT101': 'Mathematics for Life Science-1',
  
  'GYMAT101': 'Mathematics for Electrical & Physical Sciences-1',
  'GYMAT114': 'Vector Calculus, Differential Equations and Transforms',
  'GAMAT114': 'Vector Calculus, Differential Equations and Transforms (Group A)',
  
  'GAPHT102': 'Physics for Information Science',
  'GBPHT102': 'Physics for Electrical Science',
  'GCPHT102': 'Physics for Physical Science',
  
  'GACYT103': 'Chemistry for Information Science',
  'GBCYT103': 'Chemistry for Electrical Science',
  'GCCYT103': 'Chemistry for Physical Science',
  
  'GAEST104': 'Engineering Mechanics (Group A)',
  'GBEST104': 'Engineering Mechanics (Group B)',
  'GCEST104': 'Engineering Mechanics (Group C)',
  
  'GAEST105': 'Engineering Graphics (Group A)',
  'GBEST105': 'Engineering Graphics (Group B)',
  'GCEST105': 'Engineering Graphics (Group C)',
  
  'GAEST106': 'Introduction to Sustainable Engineering (Group A)',
  'GBEST106': 'Introduction to Sustainable Engineering (Group B)',
  'GCEST106': 'Introduction to Sustainable Engineering (Group C)',
  
  'GAEST107': 'Introduction to Design and Engineering (Group A)',
  'GBEST107': 'Introduction to Design and Engineering (Group B)',
  'GCEST107': 'Introduction to Design and Engineering (Group C)',
  
  'GAHUT108': 'Professional Communication (Group A)',
  'GBHUT108': 'Professional Communication (Group B)',
  'GCHUT108': 'Professional Communication (Group C)',
  
  'GAHUT109': 'Universal Human Values (Group A)',
  'GBHUT109': 'Universal Human Values (Group B)',
  'GCHUT109': 'Universal Human Values (Group C)',
  
  'GAPHL110': 'Engineering Physics Lab (Group A)',
  'GBPHL110': 'Engineering Physics Lab (Group B)',
  'GCPHL110': 'Engineering Physics Lab (Group C)',
  
  'GACYL111': 'Engineering Chemistry Lab (Group A)',
  'GBCYL111': 'Engineering Chemistry Lab (Group B)',
  'GCCYL111': 'Engineering Chemistry Lab (Group C)',
  
  'GAESL112': 'Civil & Mechanical Workshop (Group A)',
  'GBESL112': 'Civil & Mechanical Workshop (Group B)',
  'GCESL112': 'Civil & Mechanical Workshop (Group C)',
  
  'GAESL113': 'Electrical & Electronics Workshop (Group A)',
  'GBESL113': 'Electrical & Electronics Workshop (Group B)',
  'GCESL113': 'Electrical & Electronics Workshop (Group C)',
  
  'GAEST115': 'Programming in C (Group A)',
  'GBEST115': 'Programming in C (Group B)',
  'GCEST115': 'Programming in C (Group C)',
  
  'GAEST116': 'Health and Safety (Group A)',
  'GBEST116': 'Health and Safety (Group B)',
  'GCEST116': 'Health and Safety (Group C)',
  
  'GAHUT117': 'Life Skills (Group A)',
  'GBHUT117': 'Life Skills (Group B)',
  'GCHUT117': 'Life Skills (Group C)',
  
  'GSEC101': 'Digital 101',
  'GXEST204': 'Programming in C',
  'GXCYT122': 'Chemistry for Information & Electrical Science',
  
  // ─── University Core & Humanities (S3 - S6) ──────────────────────────────
  'UCHUT346': 'Engineering Economics and Financial Management',
  'UCHUT347': 'Engineering Ethics and Sustainable Development',
  'UCHUT301': 'Engineering Economics and Financial Management',
  'UCHUT302': 'Engineering Ethics and Sustainable Development',

  // ─── S3 & S4 Mathematics ─────────────────────────────────────────────────
  'GAMAT301': 'Mathematics for Information Science-3',
  'GYMAT301': 'Mathematics for Electrical & Physical Sciences-3',
  'GYMAT314': 'Vector Calculus, Differential Equations and Transforms-2',
  'GAMAT314': 'Vector Calculus, Differential Equations and Transforms-2 (Group A)',

  // ─── Group A: Computer Science & Info Science (S3 - S6) ──────────────────
  'GACST301': 'Data Structures and Algorithms',
  'GACST302': 'Computer Organization and Architecture',
  'GACST303': 'Object Oriented Programming',
  'GACST304': 'Database Management Systems',
  'GACST305': 'Foundations of Computing',
  'GACST306': 'Operating Systems',
  'GACSL307': 'Data Structures Lab',
  'GACSL308': 'Object Oriented Programming Lab',
  'GACST501': 'Formal Languages and Automata Theory',
  'GACST502': 'Compiler Design',
  'GACST503': 'Computer Networks',
  'GACST504': 'Design and Analysis of Algorithms',
  'GACST601': 'Software Engineering',
  'GACST602': 'Artificial Intelligence',

  // ─── Group B: Electrical Science (S3 - S6) ───────────────────────────────
  // ECE
  'GBECT301': 'Solid State Devices',
  'GBECT302': 'Analog Circuits',
  'GBECT303': 'Logic Circuit Design',
  'GBECT304': 'Signals and Systems',
  'GBECT305': 'Network Theory',
  'GBECT306': 'Computer Architecture and Microcontrollers',
  'GBECL307': 'Scientific Computing Lab',
  'GBECL308': 'Analog Circuits Lab',
  'GBECT501': 'Linear Integrated Circuits',
  'GBECT502': 'Digital Signal Processing',
  'GBECT503': 'Electromagnetic Waves',
  'GBECT601': 'VLSI Design',
  'GBECT602': 'Communication Engineering',
  // EEE
  'GBEET301': 'Circuits and Networks',
  'GBEET302': 'Electrical Measurements and Instrumentation',
  'GBEET303': 'Analog Electronics',
  'GBEET304': 'Electrical Machines I',
  'GBEEL307': 'Circuits and Measurements Lab',
  'GBEEL308': 'Electrical Machines Lab I',
  'GBEET501': 'Power Systems I',
  'GBEET502': 'Linear Control Systems',
  'GBEET503': 'Microprocessors and Microcontrollers',
  'GBEET601': 'Power Systems II',
  'GBEET602': 'Power Electronics',

  // ─── Group C: Physical Science (S3 - S6) ─────────────────────────────────
  // Civil
  'GCCET301': 'Mechanics of Solids',
  'GCCET302': 'Fluid Mechanics and Hydraulics',
  'GCCET303': 'Surveying and Geomatics',
  'GCCET304': 'Engineering Geology',
  'GCCEL307': 'Surveying Lab',
  'GCCEL308': 'Civil Engineering Planning and Drafting Lab',
  'GCCET501': 'Structural Analysis I',
  'GCCET502': 'Design of Concrete Structures',
  'GCCET503': 'Geotechnical Engineering I',
  'GCCET601': 'Structural Analysis II',
  'GCCET602': 'Environmental Engineering',
  // Mechanical
  'GCMET301': 'Mechanics of Solids',
  'GCMET302': 'Engineering Thermodynamics',
  'GCMET303': 'Mechanics of Fluids',
  'GCMET304': 'Metallurgy and Material Science',
  'GCMEL307': 'Computer Aided Machine Drawing',
  'GCMEL308': 'Materials Testing Lab',
  'GCMET501': 'Mechanics of Machinery',
  'GCMET502': 'Thermal Engineering',
  'GCMET503': 'Machine Tools and Metrology',
  'GCMET601': 'Heat and Mass Transfer',
  'GCMET602': 'Dynamics and Design of Machinery',
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
