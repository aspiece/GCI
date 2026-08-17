const SITE_CONFIG = {
  storageKeys: {
    selectedCourse: 'gci-launch-selected-course',
    progress: 'gci-launch-progress'
  },
  schoolSystems: [
    {
      label: 'School Google Account',
      url: 'https://accounts.google.com/',
      note: 'Use your school account only.'
    },
    {
      label: 'Gmail',
      url: 'https://mail.google.com/',
      note: 'Check for school messages and announcements.'
    },
    {
      label: 'Google Drive',
      url: 'https://drive.google.com/',
      note: 'Open your school files and shared resources.'
    }
  ],
  setupCheckUrl: 'https://example.com/REPLACE-WITH-GCI-SETUP-CHECK-FORM',
  helpFormUrl: 'https://example.com/REPLACE-WITH-GCI-HELP-FORM',
  firstMissionDefaultUrl: 'https://example.com/REPLACE-WITH-FIRST-MISSION-ACTIVITY',
  orientationTopics: [
    'Where assignments are posted',
    'How assignments are submitted',
    'What to do when absent',
    'How to ask for help',
    'Equipment expectations',
    'What to do when technology fails',
    'Appropriate AI use',
    'How grades work'
  ],
  courses: {
    cs: {
      name: 'Computer Science',
      shortLabel: 'Computer Science',
      description: 'Coding foundations, digital problem solving, and course systems setup.',
      lms: [
        { label: 'Google Classroom', url: 'https://classroom.google.com/' }
      ],
      tools: [
        { label: 'CodeHS', url: 'https://codehs.com/' },
        { label: 'GitHub', url: 'https://github.com/' },
        { label: 'Course Coding Environment', url: 'https://example.com/REPLACE-WITH-CS-CODING-ENVIRONMENT' },
        { label: 'Student Help Desk', url: 'https://example.com/REPLACE-WITH-STUDENT-HELP-DESK' }
      ],
      syllabusUrl: 'https://example.com/REPLACE-WITH-COMPUTER-SCIENCE-SYLLABUS',
      orientationUrl: 'https://example.com/REPLACE-WITH-COMPUTER-SCIENCE-ORIENTATION',
      firstMissionUrl: 'https://example.com/REPLACE-WITH-COMPUTER-SCIENCE-FIRST-MISSION'
    },
    hardware: {
      name: 'Computer Hardware',
      shortLabel: 'Computer Hardware',
      description: 'Hardware, systems, troubleshooting, and certification-oriented course startup.',
      lms: [
        { label: 'Canvas', url: 'https://example.com/REPLACE-WITH-DISTRICT-CANVAS-URL' }
      ],
      tools: [
        { label: 'Certification Resources', url: 'https://example.com/REPLACE-WITH-CERTIFICATION-RESOURCES' },
        { label: 'Hardware Resources', url: 'https://example.com/REPLACE-WITH-HARDWARE-RESOURCES' },
        { label: 'Student Help Desk', url: 'https://example.com/REPLACE-WITH-STUDENT-HELP-DESK' }
      ],
      syllabusUrl: 'https://example.com/REPLACE-WITH-COMPUTER-HARDWARE-SYLLABUS',
      orientationUrl: 'https://example.com/REPLACE-WITH-COMPUTER-HARDWARE-ORIENTATION',
      firstMissionUrl: 'https://example.com/REPLACE-WITH-COMPUTER-HARDWARE-FIRST-MISSION'
    },
    apcsa_game: {
      name: 'AP CSA / Game Design',
      shortLabel: 'AP CSA / Game Design',
      description: 'Advanced programming workflow, class systems, and creative development tools.',
      lms: [
        { label: 'Google Classroom', url: 'https://classroom.google.com/' },
        { label: 'Canvas', url: 'https://example.com/REPLACE-WITH-DISTRICT-CANVAS-URL' }
      ],
      tools: [
        { label: 'GitHub', url: 'https://github.com/' },
        { label: 'Course Coding Environment', url: 'https://example.com/REPLACE-WITH-APCSA-CODING-ENVIRONMENT' },
        { label: 'CodeHS', url: 'https://codehs.com/' }
      ],
      syllabusUrl: 'https://example.com/REPLACE-WITH-APCSA-GAME-DESIGN-SYLLABUS',
      orientationUrl: 'https://example.com/REPLACE-WITH-APCSA-GAME-DESIGN-ORIENTATION',
      firstMissionUrl: 'https://example.com/REPLACE-WITH-APCSA-GAME-DESIGN-FIRST-MISSION'
    },
    career: {
      name: 'Career Essentials',
      shortLabel: 'Career Essentials',
      description: 'Career readiness tools, class systems, and onboarding for professional habits.',
      lms: [
        { label: 'Canvas', url: 'https://example.com/REPLACE-WITH-DISTRICT-CANVAS-URL' }
      ],
      tools: [
        { label: 'Certification Resources', url: 'https://example.com/REPLACE-WITH-CAREER-CERTIFICATION-RESOURCES' },
        { label: 'Student Help Desk', url: 'https://example.com/REPLACE-WITH-STUDENT-HELP-DESK' },
        { label: 'Course Tool Workspace', url: 'https://example.com/REPLACE-WITH-CAREER-ESSENTIALS-TOOL' }
      ],
      syllabusUrl: 'https://example.com/REPLACE-WITH-CAREER-ESSENTIALS-SYLLABUS',
      orientationUrl: 'https://example.com/REPLACE-WITH-CAREER-ESSENTIALS-ORIENTATION',
      firstMissionUrl: 'https://example.com/REPLACE-WITH-CAREER-ESSENTIALS-FIRST-MISSION'
    }
  }
};

window.SITE_CONFIG = SITE_CONFIG;
