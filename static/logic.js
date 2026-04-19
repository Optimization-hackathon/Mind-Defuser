let currentStudent = null;
let studentStats = {
  gamesPlayed: 0,
  correctAnswers: 0,
  totalAnswers: 0,
  topicsMastered: [],
  accuracy: 0,
};

const bombState = {
  totalTime: 120,
  timeRemaining: 120,
  timerInterval: null,
  isActive: false,
  errorLog: [],
};

const questionsConfig = [
  {
    id: 'wireModule',
    title: 'Module 2: Kablolar',
    question: 'Su bileşiğinin formülü hangisidir?',
    instructions: 'Doğru seçeneğin rengindeki kabloyu bombadan imha et.',
    type: 'choice',
    options: ['Red', 'Blue', 'Yellow', 'Green'],
    correct: 'Yellow',
    solvedLabel: 'Cut the yellow cable by clicking it on the bomb panel.',
  },
  {
    id: 'buttonModule',
    title: 'Module 3: Kırmızı Buton & Sayaç',
    question: '12 + 10 hangi sayının birler basamağına eşittir?',
    instructions: 'Doğru cevabın birler basamağı anahtar sayıdır. Basılı tut ve doğru anda bırak.',
    type: 'input',
    inputPlaceholder: 'Enter the answer',
    correct: '22',
    keyDigit: '2',
    solvedLabel: 'Hold the red button and release when the timer contains the key digit.',
  },
  {
    id: 'keypadModule',
    title: 'Module 4: Sembol Tuşları',
    question: 'Hangi sembol matematiksel kök sembolüdür?',
    instructions: 'Doğru sembolü seçin ve modüldeki tuşa basın.',
    type: 'symbol',
    options: ['Σ', 'Ψ', 'Ω', 'ξ'],
    correct: 'Ω',
    solvedLabel: 'Press the correct symbol button on the keypad.',
  },
  {
    id: 'dialModule',
    title: 'Module 5: Döner Düğme',
    question: '4 + 24 = ?',
    instructions: 'Text boxa doğru cevabı girip CHECK deyin. Doğruysa gizli hareketler açığa çıkar.',
    type: 'dial',
    inputPlaceholder: 'Enter the answer',
    correct: '28',
    moves: ['R', 'R', 'R', 'L', 'L'],
    solvedLabel: 'Follow the unlocked dial moves by pressing Left or Right.',
  },
  {
    id: 'colorModule',
    title: 'Module 6: Renkli Butonlar',
    question: 'Renk eşleştirmeye göre hangi renk düğmeye basmalısın?',
    instructions: 'Kırmızı: 3, Mavi: 1, Yeşil: 4, Sarı: 2. Doğru renge basın.',
    type: 'choice',
    options: ['Red', 'Blue', 'Green', 'Yellow'],
    correct: 'Green',
    solvedLabel: 'Press the matching green button on the bomb panel.',
  },
];

const manualPages = questionsConfig;

const moduleState = {
  wireModule: { solved: false, unlocked: false },
  buttonModule: { solved: false, unlocked: false },
  keypadModule: { solved: false, unlocked: false },
  dialModule: { solved: false, unlocked: false },
  colorModule: { solved: false, unlocked: false },
};

const manualState = {
  currentPage: 0,
  totalPages: manualPages.length,
  dialProgress: 0,
  redButtonKeyDigit: null,
  redButtonHeld: false,
  dialMoves: [],
  dialRotation: 0,
};

function getCurrentManualPage() {
  return manualPages[manualState.currentPage];
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'module-notification';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 1800);
}

window.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  updateManualDisplay();
  updateStatusPanel();
  attachModuleEvents();
});

function initEventListeners() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const startBombBtn = document.getElementById('startBombBtn');
  const backToMainBtn = document.getElementById('backToMainBtn');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');

  if (loginBtn) loginBtn.addEventListener('click', loginStudent);
  if (logoutBtn) logoutBtn.addEventListener('click', logoutStudent);
  if (startBombBtn) startBombBtn.addEventListener('click', startGame);
  if (backToMainBtn) backToMainBtn.addEventListener('click', backToMain);
  if (prevPageBtn) prevPageBtn.addEventListener('click', () => flipPage(-1));
  if (nextPageBtn) nextPageBtn.addEventListener('click', () => flipPage(1));

  document.addEventListener('keydown', (event) => {
    if (!document.getElementById('game')?.classList.contains('active')) return;
    if (event.key === 'ArrowLeft') flipPage(-1);
    if (event.key === 'ArrowRight') flipPage(1);
  });
}

function loginStudent() {
  const studentName = document.getElementById('studentName').value.trim();
  const grade = document.getElementById('loginDifficulty').value;
  if (!studentName) {
    alert('Lütfen bir isim girin.');
    return;
  }
  currentStudent = { name: studentName, grade: grade };

  const savedStats = localStorage.getItem(`stats_${studentName}`);
  if (savedStats) {
    studentStats = JSON.parse(savedStats);
  }

  populateSubjectSelect(grade);
  document.getElementById('login').style.display = 'none';
  document.getElementById('mainInterface').classList.add('active');
  document.getElementById('welcomeText').textContent = `Welcome, ${studentName}! (${grade})`;
  updateStatusPanel();
}

function populateSubjectSelect(grade) {
  const subjectSelect = document.getElementById('gameSubject');
  if (!subjectSelect) return;
  const subjects = {
    'Grade 5': ['Mathematics', 'Science', 'Social Studies', 'Information Technologies and Software'],
    'Grade 6': ['Mathematics', 'Science', 'Social Studies', 'Information Technologies and Software'],
  };
  const list = subjects[grade] || ['Mathematics', 'Science', 'General Knowledge'];
  subjectSelect.innerHTML = '';
  list.forEach((item) => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    subjectSelect.appendChild(option);
  });
}

function logoutStudent() {
  if (!confirm('Are you sure you want to logout?')) return;
  currentStudent = null;
  document.getElementById('login').style.display = 'block';
  document.getElementById('mainInterface').classList.remove('active');
  document.getElementById('game').classList.remove('active');
  document.getElementById('studentName').value = '';
}

function startGame() {
  if (!currentStudent) {
    alert('Please login first.');
    return;
  }
  resetGameState();
  document.getElementById('mainInterface').classList.remove('active');
  document.getElementById('game').classList.add('active');
  document.getElementById('play')?.classList.add('active');
  startBombTimer();
  // Unlock modules that don't need manual answers
  moduleState.wireModule.unlocked = true;
  moduleState.keypadModule.unlocked = true;
  moduleState.colorModule.unlocked = true;
  updateManualDisplay();
  updateStatusPanel();
  addAIMessage('Bomb modules are ready. Read the manual and solve each module.');
}

function resetGameState() {
  stopBombTimer();
  bombState.timeRemaining = bombState.totalTime;
  bombState.errorLog = [];
  manualState.currentPage = 0;
  manualState.dialProgress = 0;
  manualState.redButtonHeld = false;
  manualState.redButtonKeyDigit = null;
  manualState.dialMoves = [];
  manualState.dialRotation = 0;
  Object.keys(moduleState).forEach((moduleId) => {
    moduleState[moduleId].solved = false;
    moduleState[moduleId].unlocked = false;
  });
  // Reset wire visibility
  document.querySelectorAll('#wireModule .wire').forEach((wire) => {
    wire.style.display = '';
  });
  updateTimerDisplay();
  updateStatusPanel();
  updateModulePanels();
}

function startBombTimer() {
  bombState.isActive = true;
  stopBombTimer();
  bombState.timerInterval = setInterval(() => {
    bombState.timeRemaining -= 1;
    if (bombState.timeRemaining <= 0) {
      bombState.timeRemaining = 0;
      updateTimerDisplay();
      bombExplosion();
      return;
    }
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById('timerDisplay');
  if (!timerDisplay) return;
  const minutes = Math.floor(bombState.timeRemaining / 60);
  const seconds = bombState.timeRemaining % 60;
  timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  if (bombState.timeRemaining <= 10) {
    timerDisplay.style.color = '#ff0000';
    timerDisplay.style.animation = 'blink 0.5s infinite';
  } else if (bombState.timeRemaining <= 30) {
    timerDisplay.style.color = '#ff6633';
    timerDisplay.style.animation = 'blink 1s infinite';
  } else {
    timerDisplay.style.color = '#ff3333';
    timerDisplay.style.animation = 'none';
  }
}

function bombExplosion() {
  stopBombTimer();
  bombState.isActive = false;
  const timerDisplay = document.getElementById('timerDisplay');
  if (timerDisplay) {
    timerDisplay.textContent = '💥💥💥';
    timerDisplay.style.color = '#ff0000';
    timerDisplay.style.fontSize = '48px';
  }
  alert('⚠️ TIME EXPIRED! Bomb exploded. Restart and solve the modules faster.');
  endGame(false);
}

function stopBombTimer() {
  if (bombState.timerInterval) {
    clearInterval(bombState.timerInterval);
    bombState.timerInterval = null;
  }
}

function flipPage(direction) {
  const nextPage = manualState.currentPage + direction;
  if (nextPage < 0 || nextPage >= manualState.totalPages) return;
  manualState.currentPage = nextPage;
  updateManualDisplay();
}

function updateManualDisplay() {
  const pageContent = document.getElementById('manualPageContent');
  const pageNumber = document.getElementById('manualPageNumber');
  if (!pageContent || !pageNumber) return;
  const current = getCurrentManualPage();
  pageContent.innerHTML = '';
  
  // Display as plain text without buttons
  const title = document.createElement('div');
  title.className = 'question-number';
  title.textContent = current.title;
  
  const question = document.createElement('div');
  question.className = 'question-text';
  question.style.marginBottom = '15px';
  question.textContent = current.question;
  
  const instructions = document.createElement('div');
  instructions.className = 'question-text';
  instructions.style.marginBottom = '15px';
  instructions.textContent = current.instructions;
  
  pageContent.appendChild(title);
  pageContent.appendChild(question);
  pageContent.appendChild(instructions);
  
  // For wire module, show formatted options
  if (current.id === 'wireModule') {
    const optionsText = document.createElement('div');
    optionsText.className = 'question-text';
    optionsText.style.fontSize = '16px';
    optionsText.style.lineHeight = '1.6';
    optionsText.innerHTML = `
      <div style="margin: 10px 0;">
        🔴 Kırmızı: CO &nbsp;&nbsp;|&nbsp;&nbsp; 🔵 Mavi: CO2<br>
        🟡 Sarı: H2O &nbsp;&nbsp;|&nbsp;&nbsp; 🟢 Yeşil: H2
      </div>
      <div style="margin-top: 15px; font-weight: bold; color: #8b4513;">
        Talimat: Doğru seçeneğin rengindeki kabloyu bombadan imha et.
      </div>
    `;
    pageContent.appendChild(optionsText);
  }
  
  // For keypad module, show symbols
  if (current.id === 'keypadModule') {
    const optionsText = document.createElement('div');
    optionsText.className = 'question-text';
    optionsText.style.fontSize = '16px';
    optionsText.style.lineHeight = '1.6';
    optionsText.innerHTML = `
      <div style="margin: 10px 0;">
        Semboller: Σ, Ψ, Ω, ξ
      </div>
      <div style="margin-top: 15px; font-weight: bold; color: #8b4513;">
        Talimat: Doğru sembolü tuş takımında seç.
      </div>
    `;
    pageContent.appendChild(optionsText);
  }
  
  // For color module, show colors
  if (current.id === 'colorModule') {
    const optionsText = document.createElement('div');
    optionsText.className = 'question-text';
    optionsText.style.fontSize = '16px';
    optionsText.style.lineHeight = '1.6';
    optionsText.innerHTML = `
      <div style="margin: 10px 0;">
        🔴 Kırmızı: 3 &nbsp;&nbsp;|&nbsp;&nbsp; 🔵 Mavi: 1<br>
        🟢 Yeşil: 4 &nbsp;&nbsp;|&nbsp;&nbsp; 🟡 Sarı: 2
      </div>
      <div style="margin-top: 15px; font-weight: bold; color: #8b4513;">
        Talimat: Doğru renge bas.
      </div>
    `;
    pageContent.appendChild(optionsText);
  }
  
  // For modules that need input (button and dial)
  if (current.type === 'input' || current.type === 'dial') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'manualAnswerInput';
    input.placeholder = current.inputPlaceholder || 'Answer';
    input.style.marginTop = '12px';
    input.style.width = '100%';
    input.style.padding = '12px';
    input.style.border = '2px solid #444';
    input.style.borderRadius = '8px';
    input.style.background = '#f8f8f0';
    input.style.color = '#000';
    input.style.fontFamily = 'Courier New, monospace';
    const button = document.createElement('button');
    button.textContent = 'CHECK';
    button.className = 'start-btn';
    button.style.marginTop = '12px';
    button.onclick = () => {
      const value = document.getElementById('manualAnswerInput')?.value.trim();
      completeManualPage(value);
    };
    const hint = document.createElement('div');
    hint.id = 'manualInputHint';
    hint.style.color = '#0055cc';
    hint.style.marginTop = '10px';
    hint.style.fontSize = '14px';
    hint.textContent = moduleState[current.id].unlocked
      ? 'Module unlocked. Follow the bomb panel instructions.'
      : 'Enter the answer to unlock the module.';
    pageContent.appendChild(input);
    pageContent.appendChild(button);
    pageContent.appendChild(hint);
  }
  
  if (moduleState[current.id].solved) {
    const solvedBadge = document.createElement('div');
    solvedBadge.textContent = '✓ Module solved';
    solvedBadge.style.marginTop = '16px';
    solvedBadge.style.padding = '10px';
    solvedBadge.style.background = 'rgba(0,255,0,0.1)';
    solvedBadge.style.color = '#00ff00';
    solvedBadge.style.borderRadius = '8px';
    pageContent.appendChild(solvedBadge);
  }
  
  if (current.type === 'dial' && moduleState[current.id].unlocked && !moduleState[current.id].solved) {
    const hidden = document.createElement('div');
    hidden.textContent = 'Hidden moves: 3 Right, 2 Left';
    hidden.style.marginTop = '14px';
    hidden.style.color = '#00ff99';
    hidden.style.fontWeight = 'bold';
    pageContent.appendChild(hidden);
  }
  
  pageNumber.textContent = `Page ${manualState.currentPage + 1} / ${manualState.totalPages}`;
  toggleManualControls();
  updateStatusPanel();
}

function toggleManualControls() {
  const prevButton = document.getElementById('prevPage');
  const nextButton = document.getElementById('nextPage');
  if (prevButton) {
    prevButton.classList.toggle('disabled', manualState.currentPage === 0);
  }
  if (nextButton) {
    nextButton.classList.toggle('disabled', manualState.currentPage === manualState.totalPages - 1);
  }
}

function completeManualPage(answer) {
  const current = getCurrentManualPage();
  if (!answer) {
    logError('Manual answer boş bırakılamaz.');
    return;
  }
  if (answer.toString().trim().toLowerCase() === current.correct.toString().trim().toLowerCase()) {
    if (moduleState[current.id].unlocked) {
      addAIMessage(`${current.title} manuali zaten açıldı.`);
      return;
    }
    moduleState[current.id].unlocked = true;
    if (current.id === 'buttonModule') {
      manualState.redButtonKeyDigit = current.keyDigit;
      const status = document.getElementById('redButtonStatus');
      if (status) status.textContent = `Key digit acquired: ${manualState.redButtonKeyDigit}`;
    }
    if (current.id === 'dialModule') {
      manualState.dialProgress = 0;
      manualState.dialMoves = [];
      const status = document.getElementById('dialInstruction');
      if (status) status.textContent = 'Hidden dial moves available: 3 Right, 2 Left.';
      const dialStatus = document.getElementById('dialStatus');
      if (dialStatus) dialStatus.textContent = 'Use Left/Right actions to follow the sequence.';
    }
    addAIMessage(`${current.title} unlocked. ${current.solvedLabel}`);
    updateStatusPanel();
    updateManualDisplay();
  } else {
    logError(`${current.title} manual answer is wrong.`);
  }
}

function attachModuleEvents() {
  document.querySelectorAll('#wireModule .wire').forEach((wire) => {
    wire.addEventListener('click', () => handleWireCut(wire.classList[1]));
  });
  document.querySelectorAll('#keypadModule .key').forEach((key) => {
    key.addEventListener('click', () => handleSymbolPress(key.textContent.trim()));
  });
  document.querySelectorAll('#colorModule .color-square').forEach((square) => {
    square.addEventListener('click', () => {
      const classes = Array.from(square.classList);
      const colorClass = classes.find((name) => name.endsWith('-square'));
      if (!colorClass) return;
      handleColorButton(colorClass.replace('-square', ''));
    });
  });
  const redActionButton = document.getElementById('redActionButton');
  if (redActionButton) {
    redActionButton.addEventListener('mousedown', startRedButtonHold);
    redActionButton.addEventListener('mouseup', releaseRedButton);
    redActionButton.addEventListener('mouseleave', () => {
      if (manualState.redButtonHeld) releaseRedButton();
    });
  }
  const dialLeft = document.getElementById('dialLeft');
  const dialRight = document.getElementById('dialRight');
  if (dialLeft) dialLeft.addEventListener('click', () => turnDial('L'));
  if (dialRight) dialRight.addEventListener('click', () => turnDial('R'));
}

function handleWireCut(color) {
  if (!moduleState.wireModule.unlocked) {
    const message = 'Read the manual and solve the question first!';
    logError(message);
    showToast(message);
    return;
  }
  if (moduleState.wireModule.solved) return;
  const currentPage = getCurrentManualPage();
  const expected = currentPage && currentPage.id === 'wireModule'
    ? currentPage.correct.toLowerCase()
    : manualPages.find((page) => page.id === 'wireModule').correct.toLowerCase();
  if (color.toLowerCase() === expected) {
    // Hide the wire by setting display to none
    const wireElement = document.querySelector(`#wireModule .wire.${color}`);
    if (wireElement) {
      wireElement.style.display = 'none';
    }
    moduleState.wireModule.solved = true;
    activateModule('wireModule');
    addAIMessage('Wire module solved!');
  } else {
    handleWrongAction('Wrong wire cut. 30 seconds penalty.');
  }
  updateStatusPanel();
}

function startRedButtonHold() {
  if (!moduleState.buttonModule.unlocked || moduleState.buttonModule.solved) {
    const message = 'Read the manual and solve the question first!';
    showToast(message);
    if (!moduleState.buttonModule.unlocked) logError(message);
    return;
  }
  if (!manualState.redButtonKeyDigit) {
    logError('Button module key digit bilinmiyor. Manuali çözün.');
    return;
  }
  manualState.redButtonHeld = true;
  const label = document.getElementById('redButtonLabel');
  if (label) label.textContent = 'HOLDING';
}

function releaseRedButton() {
  if (!manualState.redButtonHeld) return;
  manualState.redButtonHeld = false;
  const label = document.getElementById('redButtonLabel');
  if (label) label.textContent = 'HOLD';
  if (!moduleState.buttonModule.unlocked || moduleState.buttonModule.solved) return;
  const timerText = document.getElementById('timerDisplay')?.textContent || '';
  const status = document.getElementById('redButtonStatus');
  if (timerText.includes(manualState.redButtonKeyDigit)) {
    moduleState.buttonModule.solved = true;
    activateModule('buttonModule');
    if (status) status.textContent = 'Button module solved successfully!';
    addAIMessage('Red button module solved!');
  } else {
    if (status) status.textContent = 'Wrong release timing. Try again after penalty.';
    handleWrongAction('Red button released at wrong time. 30 seconds penalty.');
  }
  updateStatusPanel();
}

function handleSymbolPress(symbol) {
  if (!moduleState.keypadModule.unlocked) {
    const message = 'Read the manual and solve the question first!';
    logError(message);
    showToast(message);
    return;
  }
  if (moduleState.keypadModule.solved) return;
  const expected = manualPages.find((page) => page.id === 'keypadModule').correct;
  if (symbol === expected) {
    moduleState.keypadModule.solved = true;
    activateModule('keypadModule');
    addAIMessage('Symbol keypad solved!');
  } else {
    handleWrongAction('Wrong symbol pressed. 30 seconds penalty.');
  }
  updateStatusPanel();
}

function handleColorButton(color) {
  if (!moduleState.colorModule.unlocked) {
    const message = 'Read the manual and solve the question first!';
    logError(message);
    showToast(message);
    return;
  }
  if (moduleState.colorModule.solved) return;
  const expected = manualPages.find((page) => page.id === 'colorModule').correct.toLowerCase();
  if (color.toLowerCase() === expected) {
    moduleState.colorModule.solved = true;
    activateModule('colorModule');
    addAIMessage('Color button module solved!');
  } else {
    handleWrongAction('Wrong color selected. 30 seconds penalty.');
  }
  updateStatusPanel();
}

function turnDial(direction) {
  if (!moduleState.dialModule.unlocked) {
    const message = 'Read the manual and solve the question first!';
    logError(message);
    showToast(message);
    return;
  }
  if (moduleState.dialModule.solved) return;
  const currentMoves = manualPages.find((page) => page.id === 'dialModule').moves;
  const expectedMove = currentMoves[manualState.dialProgress];
  if (direction === expectedMove) {
    manualState.dialProgress += 1;
    manualState.dialMoves.push(direction);
    const pointer = document.getElementById('rotaryPointer');
    if (pointer) {
      manualState.dialRotation += direction === 'R' ? 30 : -30;
      pointer.style.transform = `translateX(-50%) rotate(${manualState.dialRotation}deg)`;
    }
    const status = document.getElementById('dialStatus');
    if (status) status.textContent = `Correct move: ${manualState.dialProgress}/${currentMoves.length}`;
    if (manualState.dialProgress === currentMoves.length) {
      moduleState.dialModule.solved = true;
      activateModule('dialModule');
      addAIMessage('Dial module solved!');
    }
  } else {
    handleWrongAction('Wrong dial move. Sequence reset.');
    manualState.dialProgress = 0;
    manualState.dialMoves = [];
    const status = document.getElementById('dialStatus');
    if (status) status.textContent = 'Sequence reset. Try again.';
  }
  updateStatusPanel();
}

function activateModule(moduleId) {
  const moduleElement = document.getElementById(moduleId);
  if (!moduleElement) return;
  moduleElement.classList.add('activated');
  const greenLed = moduleElement.querySelector('.led-green');
  const redLed = moduleElement.querySelector('.led-red');
  if (greenLed) greenLed.style.backgroundColor = '#00ff00';
  if (redLed) redLed.style.backgroundColor = '#333';
  moduleElement.style.borderColor = '#00ff00';
  moduleElement.style.boxShadow = '0 0 25px rgba(0,255,0,0.8)';
  updateModulePanels();
  checkAllModulesSolved();
}

function updateModulePanels() {
  Object.keys(moduleState).forEach((moduleId) => {
    const module = document.getElementById(moduleId);
    if (!module) return;
    if (moduleState[moduleId].solved) {
      module.classList.add('solved');
      module.style.opacity = '0.95';
    } else if (moduleState[moduleId].unlocked) {
      module.style.opacity = '1';
    } else {
      module.style.opacity = '0.5';
    }
  });
}

function handleWrongAction(message) {
  logError(message);
  bombState.timeRemaining = Math.max(0, bombState.timeRemaining - 30);
  updateTimerDisplay();
  if (bombState.timeRemaining <= 0) {
    bombExplosion();
  }
}

function logError(message) {
  const timestamp = new Date().toLocaleTimeString();
  bombState.errorLog.unshift(`${timestamp} - ${message}`);
  if (bombState.errorLog.length > 5) bombState.errorLog.pop();
  const errorLogBox = document.getElementById('errorLog');
  if (errorLogBox) {
    errorLogBox.innerHTML = `<strong>Errors:</strong><br>${bombState.errorLog.map((line) => `- ${line}`).join('<br>')}`;
  }
  updateStatusPanel();
}

function updateStatusPanel() {
  const statusBox = document.getElementById('moduleStatus');
  if (!statusBox) return;
  const states = Object.entries(moduleState).map(([moduleId, state]) => {
    const page = manualPages.find((pageItem) => pageItem.id === moduleId);
    const label = page ? page.title : moduleId;
    const mark = state.solved ? '✅' : state.unlocked ? '🟡' : '🔴';
    return `${mark} ${label}`;
  });
  statusBox.innerHTML = `<strong>Module Status</strong><br>${states.join('<br>')}`;
}

function checkAllModulesSolved() {
  const allSolved = Object.values(moduleState).every((state) => state.solved);
  if (allSolved) {
    addAIMessage('All modules solved! Bomb defusal complete.');
    endGame(true);
  }
}

function endGame(success) {
  stopBombTimer();
  const dashboard = document.getElementById('dashboard');
  if (dashboard) {
    dashboard.style.display = 'block';
    document.getElementById('play')?.classList.remove('active');
    document.getElementById('dashboard')?.classList.add('active');
    document.getElementById('score').textContent = success ? '✅ Tüm modüller çözüldü!' : '❌ Bomba patladı veya süre doldu.';
    document.getElementById('mistakes').textContent = `Errors: ${bombState.errorLog.length}`;
    document.getElementById('weak_topics').textContent = success ? 'Great job! You defused it.' : 'Try again with careful timing.';
    document.getElementById('study_plan').innerHTML = success ? '🎉 Bomb defusal succeeded. Review the manual and keep practicing!' : '💡 Study the module instructions and try again.';
  }
}

function backToMain() {
  stopBombTimer();
  document.getElementById('game')?.classList.remove('active');
  document.getElementById('mainInterface')?.classList.add('active');
}

function addAIMessage(message) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message ai-message';
  messageDiv.textContent = message;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
