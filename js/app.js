(function () {
  const config = window.SITE_CONFIG;

  if (!config) {
    return;
  }

  const page = document.body.dataset.page;

  function getSelectedCourseId() {
    return localStorage.getItem(config.storageKeys.selectedCourse) || '';
  }

  function setSelectedCourseId(courseId) {
    localStorage.setItem(config.storageKeys.selectedCourse, courseId);
  }

  function getProgressState() {
    try {
      const raw = localStorage.getItem(config.storageKeys.progress);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function setProgressState(progressState) {
    localStorage.setItem(config.storageKeys.progress, JSON.stringify(progressState));
  }

  function getCourseProgress(courseId) {
    const progressState = getProgressState();
    return progressState[courseId] || {};
  }

  function setStepComplete(courseId, stepId, isComplete) {
    const progressState = getProgressState();
    const courseProgress = progressState[courseId] || {};
    courseProgress[stepId] = Boolean(isComplete);
    progressState[courseId] = courseProgress;
    setProgressState(progressState);
  }

  function resetCourseProgress(courseId) {
    const progressState = getProgressState();
    progressState[courseId] = {};
    setProgressState(progressState);
  }

  function createExternalLink(link) {
    const anchor = document.createElement('a');
    anchor.className = 'resource-link';
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.label;
    anchor.setAttribute('aria-label', `${link.label} (opens in a new tab)`);
    return anchor;
  }

  function createStepCard(step, courseId, course) {
    const stepCard = document.createElement('section');
    stepCard.className = 'card step-card';
    stepCard.setAttribute('aria-labelledby', `step-${step.id}-heading`);

    const stepHeader = document.createElement('div');
    stepHeader.className = 'step-header';

    const stepHeadingWrap = document.createElement('div');
    const stepNumber = document.createElement('span');
    stepNumber.className = 'step-number';
    stepNumber.textContent = step.number;
    stepNumber.setAttribute('aria-hidden', 'true');

    const heading = document.createElement('h3');
    heading.id = `step-${step.id}-heading`;
    heading.textContent = step.title;

    const description = document.createElement('p');
    description.className = 'muted';
    description.textContent = step.description;

    stepHeadingWrap.append(stepNumber, heading, description);

    const completionLabel = document.createElement('label');
    completionLabel.className = 'completion-control';
    completionLabel.setAttribute('for', `step-complete-${step.id}`);

    const completionInput = document.createElement('input');
    completionInput.type = 'checkbox';
    completionInput.id = `step-complete-${step.id}`;
    completionInput.checked = Boolean(getCourseProgress(courseId)[step.id]);
    completionInput.addEventListener('change', function () {
      setStepComplete(courseId, step.id, completionInput.checked);
      renderHomePage();
    });

    const completionText = document.createElement('span');
    completionText.textContent = 'Mark complete';

    completionLabel.append(completionInput, completionText);
    stepHeader.append(stepHeadingWrap, completionLabel);

    const stepBody = document.createElement('div');
    stepBody.className = 'step-body';
    stepBody.append(step.content(course));

    stepCard.append(stepHeader, stepBody);
    return stepCard;
  }

  function buildSteps(course) {
    return [
      {
        id: 'sign-in',
        number: 1,
        title: 'Sign In',
        description: 'Verify that your school account and basic Google tools work.',
        content: function () {
          const fragment = document.createDocumentFragment();
          const note = document.createElement('div');
          note.className = 'note-box';
          note.textContent = 'Use your school Google account for every service in this portal.';
          const links = document.createElement('div');
          links.className = 'link-grid';

          config.schoolSystems.forEach(function (system) {
            const wrap = document.createElement('div');
            wrap.className = 'stack-md';
            wrap.append(createExternalLink(system));
            const detail = document.createElement('p');
            detail.className = 'small muted';
            detail.textContent = system.note;
            wrap.append(detail);
            links.append(wrap);
          });

          fragment.append(note, links);
          return fragment;
        }
      },
      {
        id: 'open-class',
        number: 2,
        title: 'Open Your Class',
        description: 'Open only the course space your instructor tells you to use.',
        content: function (activeCourse) {
          const fragment = document.createDocumentFragment();
          const note = document.createElement('div');
          note.className = 'inline-banner';
          note.textContent = 'Only open or join the course your instructor tells you to use.';
          const links = document.createElement('div');
          links.className = 'link-grid';

          activeCourse.lms.forEach(function (item) {
            links.append(createExternalLink(item));
          });

          fragment.append(note, links);
          return fragment;
        }
      },
      {
        id: 'tools',
        number: 3,
        title: 'Check Your Tools',
        description: 'Open the tools used in your course and make sure they load.',
        content: function (activeCourse) {
          const links = document.createElement('div');
          links.className = 'link-grid';

          activeCourse.tools.forEach(function (tool) {
            links.append(createExternalLink(tool));
          });

          return links;
        }
      },
      {
        id: 'orientation',
        number: 4,
        title: 'Course Orientation',
        description: 'Review how your class works before you begin assignments.',
        content: function (activeCourse) {
          const fragment = document.createDocumentFragment();
          const buttonRow = document.createElement('div');
          buttonRow.className = 'button-row';

          const syllabusLink = createExternalLink({
            label: 'View Course Syllabus',
            url: activeCourse.syllabusUrl
          });
          const orientationLink = document.createElement('a');
          orientationLink.className = 'button button-secondary';
          orientationLink.href = `./orientation.html?course=${encodeURIComponent(getSelectedCourseId())}`;
          orientationLink.textContent = 'Start Course Orientation';

          buttonRow.append(syllabusLink, orientationLink);

          const list = document.createElement('ul');
          list.className = 'checklist';
          config.orientationTopics.forEach(function (topic) {
            const item = document.createElement('li');
            item.textContent = topic;
            list.append(item);
          });

          fragment.append(buttonRow, list);
          return fragment;
        }
      },
      {
        id: 'setup-check',
        number: 5,
        title: 'Setup Check',
        description: 'Use the setup check to report whether you are ready to continue.',
        content: function () {
          const fragment = document.createDocumentFragment();
          const buttonRow = document.createElement('div');
          buttonRow.className = 'button-row';
          const setupCheck = createExternalLink({
            label: 'COMPLETE MY SETUP CHECK',
            url: config.setupCheckUrl
          });
          setupCheck.classList.add('button-large');
          buttonRow.append(setupCheck);

          const statusGrid = document.createElement('div');
          statusGrid.className = 'status-grid';
          statusGrid.innerHTML = `
            <div class="status-card status-ready"><strong>🟢 READY</strong><span>Everything works.</span></div>
            <div class="status-card status-almost"><strong>🟡 ALMOST READY</strong><span>Something needs attention, but you can continue.</span></div>
            <div class="status-card status-help"><strong>🔴 HELP NEEDED</strong><span>A problem is preventing you from continuing.</span></div>
          `;

          fragment.append(buttonRow, statusGrid);
          return fragment;
        }
      },
      {
        id: 'first-mission',
        number: 6,
        title: 'First Mission',
        description: "Everything working? Don't wait.",
        content: function (activeCourse) {
          const fragment = document.createDocumentFragment();
          const heading = document.createElement('p');
          heading.innerHTML = '<strong>Meet Your Computer</strong>';

          const promptList = document.createElement('ol');
          promptList.className = 'orientation-list';
          [
            'Operating system',
            'Processor',
            'Installed RAM',
            'Total storage',
            'Available storage',
            'One specification you do not understand',
            'Your best explanation of what that specification means'
          ].forEach(function (prompt) {
            const item = document.createElement('li');
            item.textContent = prompt;
            promptList.append(item);
          });

          const buttonRow = document.createElement('div');
          buttonRow.className = 'button-row';
          const missionLink = createExternalLink({
            label: 'Start First Mission',
            url: activeCourse.firstMissionUrl || config.firstMissionDefaultUrl
          });
          buttonRow.append(missionLink);

          fragment.append(heading, promptList, buttonRow);
          return fragment;
        }
      }
    ];
  }

  function renderCoursePicker() {
    const courseGrid = document.getElementById('course-grid');
    if (!courseGrid) {
      return;
    }

    courseGrid.innerHTML = '';
    Object.entries(config.courses).forEach(function ([courseId, course]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'course-card';
      button.addEventListener('click', function () {
        setSelectedCourseId(courseId);
        renderHomePage();
      });
      button.innerHTML = `
        <h3>${course.name}</h3>
        <p>${course.description}</p>
        <div class="course-code">Open ${course.shortLabel}</div>
      `;
      courseGrid.append(button);
    });
  }

  function updateProgress(courseId, steps) {
    const progressText = document.getElementById('progress-text');
    const progressBarFill = document.getElementById('progress-bar-fill');
    if (!progressText || !progressBarFill) {
      return;
    }

    const progress = getCourseProgress(courseId);
    const completedCount = steps.filter(function (step) {
      return Boolean(progress[step.id]);
    }).length;
    const totalSteps = steps.length;
    const percent = totalSteps ? (completedCount / totalSteps) * 100 : 0;

    progressText.textContent = `${completedCount} of ${totalSteps} steps complete`;
    progressBarFill.style.width = `${percent}%`;
  }

  function renderHomePage() {
    if (page !== 'home') {
      return;
    }

    renderCoursePicker();

    const selectedCourseId = getSelectedCourseId();
    const selectedCourse = config.courses[selectedCourseId];
    const picker = document.getElementById('course-picker');
    const dashboard = document.getElementById('dashboard');
    const courseName = document.getElementById('selected-course-name');
    const courseDescription = document.getElementById('selected-course-description');
    const stepsContainer = document.getElementById('steps-container');
    const changeCourseButton = document.getElementById('change-course-button');
    const resetProgressButton = document.getElementById('reset-progress-button');

    if (!picker || !dashboard || !courseName || !courseDescription || !stepsContainer || !changeCourseButton || !resetProgressButton) {
      return;
    }

    if (!selectedCourse) {
      picker.hidden = false;
      dashboard.hidden = true;
      return;
    }

    picker.hidden = true;
    dashboard.hidden = false;
    courseName.textContent = selectedCourse.name;
    courseDescription.textContent = selectedCourse.description;
    stepsContainer.innerHTML = '';

    const steps = buildSteps(selectedCourse);
    steps.forEach(function (step) {
      stepsContainer.append(createStepCard(step, selectedCourseId, selectedCourse));
    });

    updateProgress(selectedCourseId, steps);

    changeCourseButton.onclick = function () {
      localStorage.removeItem(config.storageKeys.selectedCourse);
      renderHomePage();
      document.getElementById('course-picker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    resetProgressButton.onclick = function () {
      resetCourseProgress(selectedCourseId);
      renderHomePage();
    };
  }

  function renderOrientationPage() {
    if (page !== 'orientation') {
      return;
    }

    const courseIdFromQuery = new URLSearchParams(window.location.search).get('course');
    const selectedCourseId = courseIdFromQuery || getSelectedCourseId();
    const course = config.courses[selectedCourseId];
    const banner = document.getElementById('orientation-course-banner');
    const launchButton = document.getElementById('orientation-launch-button');
    const syllabusButton = document.getElementById('orientation-syllabus-button');
    const topicsList = document.getElementById('orientation-topics-list');

    if (topicsList) {
      topicsList.innerHTML = '';
      config.orientationTopics.forEach(function (topic) {
        const item = document.createElement('li');
        item.textContent = topic;
        topicsList.append(item);
      });
    }

    if (!banner || !launchButton || !syllabusButton || !course) {
      return;
    }

    banner.textContent = `Selected course: ${course.name}`;
    launchButton.href = course.orientationUrl;
    launchButton.target = '_blank';
    launchButton.rel = 'noopener noreferrer';
    launchButton.textContent = 'Launch Orientation Activity';
    launchButton.setAttribute('aria-label', 'Launch Orientation Activity (opens in a new tab)');

    syllabusButton.href = course.syllabusUrl;
    syllabusButton.target = '_blank';
    syllabusButton.rel = 'noopener noreferrer';
    syllabusButton.textContent = 'View Course Syllabus';
    syllabusButton.setAttribute('aria-label', 'View Course Syllabus (opens in a new tab)');
  }

  function renderHelpPage() {
    if (page !== 'help') {
      return;
    }

    const reportProblemButton = document.getElementById('report-problem-button');
    if (!reportProblemButton) {
      return;
    }

    reportProblemButton.href = config.helpFormUrl;
    reportProblemButton.target = '_blank';
    reportProblemButton.rel = 'noopener noreferrer';
    reportProblemButton.setAttribute('aria-label', 'Report a problem (opens in a new tab)');
  }

  renderHomePage();
  renderOrientationPage();
  renderHelpPage();
}());
