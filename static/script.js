let questions = [];
let currentQuestionIndex = 0;
let answers = [];
let startTime;
let currentStudent = null;
let studentStats = {
    gamesPlayed: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    topicsMastered: [],
    accuracy: 0
};

// BOMB DEFUSAL DEVICE STATE
let bombState = {
    totalTime: 120, // 2 minutes
    timeRemaining: 120,
    timerInterval: null,
    isActive: false
};

// INTERACTIVE MANUAL STATE
let manualState = {
    currentPage: 0,
    totalPages: 2,
    selectedAnswers: new Set(),
    correctAnswers: new Map([
        ['Paris', 'wireModule'],
        ['12', 'keypadModule'],
        ['Blue', 'colorModule'],
        ['80', 'dialModule'],
        ['Jupiter', 'wireModule'],
        ['6', 'keypadModule']
    ]),
    moduleMappings: {
        'wireModule': 'Wire Cutting Module',
        'keypadModule': 'Symbol Keypad Module',
        'colorModule': 'Color Match Module',
        'dialModule': 'Rotary Dial Module'
    }
};

// SUBJECT LIST BY GRADE
const subjectsByGrade = {
    "Grade 1": ["Turkish", "Mathematics", "Life Science", "Music"],
    "Grade 2": ["Turkish", "Mathematics", "Life Science", "Music", "Foreign Language"],
    "Grade 3": ["Turkish", "Mathematics", "Life Science", "Science", "Music", "Foreign Language"],
    "Grade 4": ["Turkish", "Mathematics", "Science", "Social Studies", "Music", "Human Rights, Citizenship and Democracy", "Foreign Language"],
    "Grade 5": ["Turkish", "Mathematics", "Science", "Social Studies", "Religious Culture and Ethics", "Music", "Information Technologies and Software", "Foreign Language"],
    "Grade 6": ["Turkish", "Mathematics", "Science", "Social Studies", "Religious Culture and Ethics", "Music", "Information Technologies and Software", "Foreign Language"],
    "Grade 7": ["Turkish", "Mathematics", "Science", "Social Studies", "Religious Culture and Ethics", "Music", "Technology and Design", "Foreign Language"],
    "Grade 8": ["Turkish", "Mathematics", "Science", "Revolution History and Kemalism", "Religious Culture and Ethics", "Music", "Foreign Language"],
    "Grade 9": ["Turkish Language and Literature", "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", "Religious Culture and Ethics", "Foreign Language", "Information Technologies"],
    "Grade 10": ["Turkish Language and Literature", "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", "Religious Culture and Ethics", "Foreign Language"],
    "Grade 11": ["Turkish Language and Literature", "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", "Philosophy", "Foreign Language"],
    "Grade 12": ["Turkish Language and Literature", "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", "Philosophy", "Foreign Language"]
};

// EVENT LISTENERS - LOGIN
document.getElementById('loginBtn').addEventListener('click', loginStudent);
document.getElementById('logoutBtn').addEventListener('click', logoutStudent);
document.getElementById('studentName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginStudent();
});

// EVENT LISTENERS - MAIN INTERFACE
document.getElementById('startBombBtn').addEventListener('click', startGame);
document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});
document.getElementById('backToMainBtn').addEventListener('click', backToMain);

// EVENT LISTENERS - GAME
document.getElementById('submit').addEventListener('click', submitAnswer);
document.getElementById('playAgain').addEventListener('click', () => {
    document.getElementById('game').classList.remove('active');
    document.getElementById('mainInterface').classList.add('active');
});

// ============ BOMB DEFUSAL DEVICE FUNCTIONS ============

function startBombTimer() {
    bombState.isActive = true;
    bombState.timeRemaining = bombState.totalTime;
    
    bombState.timerInterval = setInterval(() => {
        bombState.timeRemaining--;
        updateTimerDisplay();
        
        if (bombState.timeRemaining <= 0) {
            bombExplosion();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(bombState.timeRemaining / 60);
    const seconds = bombState.timeRemaining % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const timerDisplay = document.getElementById('timerDisplay');
    
    if (timerDisplay) {
        timerDisplay.textContent = timeStr;
        
        // Color change based on urgency
        if (bombState.timeRemaining <= 10) {
            timerDisplay.style.color = '#ff0000';
            timerDisplay.style.animation = 'blink 0.5s infinite';
        } else if (bombState.timeRemaining <= 30) {
            timerDisplay.style.color = '#ff6633';
            timerDisplay.style.animation = 'blink 1s infinite';
        }
    }
}

function bombExplosion() {
    clearInterval(bombState.timerInterval);
    bombState.isActive = false;
    
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = '💥💥💥';
        timerDisplay.style.color = '#ff0000';
        timerDisplay.style.fontSize = '48px';
    }
    
    alert('⚠️ TIME EXPIRED! 💣 BOMB EXPLODED! ⚠️\n\nYou must answer questions faster to defuse the bomb!');
    backToMain();
}

function stopBombTimer() {
    if (bombState.timerInterval) {
        clearInterval(bombState.timerInterval);
        bombState.isActive = false;
    }
}

function handleAbortClick() {
    alert('⚠️ ABORT SEQUENCE INITIATED!\n\nBomb defusal cancelled. Mission failed!');
    stopBombTimer();
    backToMain();
}

function updateModulesProgress() {
    const moduleCount = questions.length;
    const progress = ((currentQuestionIndex) / moduleCount) * 100;
    
    // Update visual representation if needed
    const modules = document.querySelectorAll('.modules-grid .module:not(.timer-module):not(.abort-module)');
    modules.forEach((module, index) => {
        if (index < currentQuestionIndex) {
            module.style.opacity = '0.5';
            module.style.borderColor = '#00ff00';
        } else if (index === currentQuestionIndex) {
            module.style.borderColor = '#1e90ff';
            module.style.boxShadow = '0 0 30px rgba(30, 144, 255, 0.8), inset 0 0 20px rgba(0, 0, 0, 0.7)';
        }
    });
}

// ============ LOGIN FUNCTIONS ============
function loginStudent() {
    const studentName = document.getElementById('studentName').value.trim();
    const grade = document.getElementById('loginDifficulty').value;
    
    if (!studentName) {
        alert('Please enter your name');
        return;
    }
    
    currentStudent = {
        name: studentName,
        grade: grade,
        loginTime: new Date()
    };
    
    // Load or initialize student stats from localStorage
    const savedStats = localStorage.getItem(`stats_${studentName}`);
    if (savedStats) {
        studentStats = JSON.parse(savedStats);
    } else {
        studentStats = {
            gamesPlayed: 0,
            correctAnswers: 0,
            totalAnswers: 0,
            topicsMastered: [],
            accuracy: 0
        };
    }
    
    // Populate subject select based on grade
    populateSubjectSelect(grade);
    
    // Show main interface
    document.getElementById('login').style.display = 'none';
    document.getElementById('mainInterface').classList.add('active');
    document.getElementById('welcomeText').textContent = `Welcome, ${studentName}! (${grade})`;
    
    updateProgressDisplay();
}

function populateSubjectSelect(grade) {
    const subjectSelect = document.getElementById('gameSubject');
    subjectSelect.innerHTML = ''; // Clear existing options
    
    const subjects = subjectsByGrade[grade] || [];
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
    });
    
    // Populate topics when subject changes
    subjectSelect.addEventListener('change', function() {
        populateTopicsSelect(this.value);
    });
    
    // Initially populate topics for the first subject
    if (subjects.length > 0) {
        populateTopicsSelect(subjects[0]);
    }
}

function populateTopicsSelect(subject) {
    const topicsSelect = document.getElementById('gameTopics');
    topicsSelect.innerHTML = ''; // Clear existing options
    
    // Define topics by grade
    const topicsByGrade = {
        "Grade 5": ["arithmetic", "fractions", "algebra", "geometry"],
        "Grade 6": ["arithmetic", "fractions", "algebra", "geometry"]
    };
    
    const topics = topicsByGrade[subject] || [];
    topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic;
        option.textContent = topic.charAt(0).toUpperCase() + topic.slice(1); // Capitalize first letter
        topicsSelect.appendChild(option);
    });
}

function logoutStudent() {
    if (confirm('Are you sure you want to logout?')) {
        currentStudent = null;
        document.getElementById('login').style.display = 'block';
        document.getElementById('mainInterface').classList.remove('active');
        document.getElementById('game').classList.remove('active');
        document.getElementById('studentName').value = '';
        document.getElementById('chatMessages').innerHTML = `
            <div class="chat-message ai-message">
                Merhaba! Ben senin AI asistanım. Bomba çözmeye çalışırken sana yardımcı olmak için buradayım. Herhangi bir sorun varsa bana sor! 👋
            </div>
        `;
    }
}

// ============ GAME FUNCTIONS ============
async function startGame() {
    const difficulty = currentStudent.grade; // Use grade instead of difficulty level
    const subject = document.getElementById('gameSubject').value;
    const selectedTopics = Array.from(document.getElementById('gameTopics').selectedOptions).map(option => option.value);
    const moduleCount = parseInt(document.getElementById('moduleCount').value, 10);
    
    try {
        const response = await fetch('/api/get_questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                difficulty: difficulty,
                subject: subject,
                topics: selectedTopics,
                num_questions: moduleCount,
                module_count: moduleCount,
                student_id: currentStudent.name
            })
        });
        
        const data = await response.json();
        questions = data.questions;
        
        // Show selected difficulty level by Gamspy
        console.log(`🎯 Gamspy selected difficulty: ${data.selected_difficulty} (based on accuracy: ${(data.student_accuracy * 100).toFixed(1)}%)`);
        addAIMessage(`📊 Seçilen Zorluk Seviyesi: ${data.selected_difficulty === 1 ? 'Kolay' : data.selected_difficulty === 2 ? 'Orta' : 'Zor'} (Geçmiş performansına göre)`);
        addAIMessage(`📚 Ders: ${subject}; 🧩 Modül Sayısı: ${moduleCount}`);
        
        currentQuestionIndex = 0;
        answers = [];
        
        // Hide main interface, show game
        document.getElementById('mainInterface').classList.remove('active');
        document.getElementById('game').classList.add('active');
        document.getElementById('play').classList.add('active');
        document.getElementById('dashboard').classList.remove('active');
        
        // Start bomb timer
        startBombTimer();
        
        // Initialize module progress display
        updateModulesProgress();
        
        showQuestion();
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Failed to start game. Please try again.');
    }
}

function showQuestion() {
    if (currentQuestionIndex >= questions.length) {
        endGame();
        return;
    }
    const q = questions[currentQuestionIndex];
    document.getElementById('question').textContent = q.question;
    document.getElementById('answer').value = '';
    document.getElementById('result').textContent = '';
    startTime = Date.now();
    
    // Update bomb device modules progress
    updateModulesProgress();
}

function updateModules() {
    // This function is now integrated into updateModulesProgress()
    updateModulesProgress();
}

function submitAnswer() {
    const userAnswer = document.getElementById('answer').value.trim();
    const q = questions[currentQuestionIndex];
    const correctAnswer = q.answer;
    const time = Date.now() - startTime;
    const correct = userAnswer === correctAnswer;
    
    answers.push({
        question: q.question,
        user_answer: userAnswer,
        correct: correct,
        time: time,
        topic: q.topic
    });
    
    document.getElementById('result').textContent = correct ? '✅ Correct!' : `❌ Wrong! Correct: ${correctAnswer}`;
    
    setTimeout(() => {
        currentQuestionIndex++;
        showQuestion();
    }, 2000);
}

async function endGame() {
    // Stop bomb timer
    stopBombTimer();
    
    document.getElementById('play').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    
    // Calculate stats
    const correctCount = answers.filter(a => a.correct).length;
    const accuracy = Math.round((correctCount / answers.length) * 100);
    
    // Update student stats
    studentStats.gamesPlayed++;
    studentStats.correctAnswers += correctCount;
    studentStats.totalAnswers += answers.length;
    studentStats.accuracy = Math.round((studentStats.correctAnswers / studentStats.totalAnswers) * 100);
    
    // Find weak topics
    const mistakes = answers.filter(a => !a.correct);
    const weakTopics = [...new Set(mistakes.map(m => m.topic))];
    
    // Save stats
    localStorage.setItem(`stats_${currentStudent.name}`, JSON.stringify(studentStats));
    
    try {
        const response = await fetch('/api/submit_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: currentStudent.name,
                difficulty: document.getElementById('gameDifficulty').value,
                answers: answers,
                accuracy: accuracy
            })
        });
        
        const data = await response.json();
        
        // Display main results
        document.getElementById('score').textContent = `📈 Skor: ${correctCount}/${answers.length}`;
        document.getElementById('mistakes').textContent = `⚠️ Doğruluk: ${accuracy}%`;
        document.getElementById('weak_topics').textContent = `📚 Zayıf Konular: ${weakTopics.length > 0 ? weakTopics.join(', ') : 'Yok!'}`;
        
        // ============ GAMSPY MODEL 2: KONU OPTİMİZASYONU ============
        let studyPlanHTML = '<strong>📖 ÇALIŞMA PLANI (Gamspy Optimizasyonu):</strong><br>';
        if (data.study_plan && Object.keys(data.study_plan).length > 0) {
            for (const [topic, time] of Object.entries(data.study_plan)) {
                if (typeof time === 'number') {
                    studyPlanHTML += `<div style="margin: 5px 0; padding: 5px; background: #f0f0f0; border-radius: 4px;">
                        <strong>${topic}</strong>: ${time.toFixed(1)} dakika
                    </div>`;
                }
            }
            studyPlanHTML += '<p style="font-size: 12px; color: #666; margin-top: 10px;">💡 Bu plan, hatalarına göre optimal şekilde hazırlanmıştır.</p>';
        } else {
            studyPlanHTML = '<p>Harika! Hata yapmadın, çalışma planına ihtiyaç yok! 🎉</p>';
        }
        document.getElementById('study_plan').innerHTML = studyPlanHTML;
        
        // ============ GAMSPY MODEL 3: PERİYODİKLİK PLANLAMA ============
        let repetitionHTML = '<strong>🔄 TEKRAR TAKVİMİ (Spaced Repetition):</strong><br>';
        if (data.repetition_schedule && Object.keys(data.repetition_schedule).length > 0) {
            for (const [topic, schedule] of Object.entries(data.repetition_schedule)) {
                if (Array.isArray(schedule) && schedule.length > 0) {
                    repetitionHTML += `<div style="margin: 8px 0; padding: 8px; background: #e3f2fd; border-left: 3px solid #2196F3; border-radius: 4px;">
                        <strong>${topic}:</strong><br>`;
                    schedule.forEach(item => {
                        repetitionHTML += `&nbsp;&nbsp;📅 ${item.interval} → ${item.review_date}<br>`;
                    });
                    repetitionHTML += `</div>`;
                }
            }
            repetitionHTML += '<p style="font-size: 12px; color: #666; margin-top: 10px;">🧠 Ebbinghaus Forgetting Curve modeline göre hazırlanmıştır.</p>';
        }
        
        // Create a container for both plans
        const plansContainer = document.getElementById('study_plan');
        plansContainer.innerHTML = studyPlanHTML + '<hr style="margin: 15px 0;" />' + repetitionHTML;
        
        // Update progress display
        updateProgressDisplay();
        
        // Add AI feedback to chat
        const feedbackMessages = [
            `✅ ${accuracy}% doğruluk oranı! ${accuracy >= 80 ? '🎉 Harika!' : accuracy >= 60 ? '👍 İyi gidiyor!' : '💪 Biraz daha çalışman gerek!'}`,
            `📊 ${data.accuracy ? (data.accuracy * 100).toFixed(0) : accuracy}% doğruluk ile senin seviyen: ${data.accuracy * 100 >= 70 ? 'İleri' : data.accuracy * 100 >= 50 ? 'Orta' : 'Başlangıç'}.`,
            `💡 Gamspy AI sistem ${weakTopics.length} zayıf konu belirledi ve çalışma planı oluşturdu!`,
            `🤖 AI Tutor: ${data.feedback || 'Keep practicing!'}`
        ];
        
        feedbackMessages.forEach(msg => addAIMessage(msg));
        
    } catch (error) {
        console.error('Error ending game:', error);
        document.getElementById('score').textContent = `Skor: ${correctCount}/${answers.length}`;
        document.getElementById('mistakes').textContent = `Doğruluk: ${accuracy}%`;
        document.getElementById('weak_topics').textContent = `Zayıf Konular: ${weakTopics.length > 0 ? weakTopics.join(', ') : 'Yok!'}`;
        addAIMessage('Oyun sonuçları kaydedilemiyor, lütfen tekrar dene.');
    }
}

function backToMain() {
    // Stop bomb timer if running
    stopBombTimer();
    
    document.getElementById('game').classList.remove('active');
    document.getElementById('mainInterface').classList.add('active');
}

// ============ CHAT FUNCTIONS ============
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    addUserMessage(message);
    input.value = '';
    addAIMessage('AI yanıtı hazırlanıyor...');

    try {
        const response = await fetch('/ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: message })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'AI yanıtı alınamadı.');
        }

        const chatMessages = document.getElementById('chatMessages');
        const pendingMessages = chatMessages.querySelectorAll('.ai-message');
        const lastPending = pendingMessages[pendingMessages.length - 1];
        if (lastPending && lastPending.textContent === 'AI yanıtı hazırlanıyor...') {
            lastPending.textContent = data.response;
        } else {
            addAIMessage(data.response);
        }
    } catch (error) {
        console.error('Chat error:', error);
        addAIMessage('Üzgünüm, AI asistanına bağlanırken bir sorun oldu. Lütfen tekrar dene.');
    }
}

function addUserMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message user-message';
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addAIMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message ai-message';
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ============ PROGRESS FUNCTIONS ============
function updateProgressDisplay() {
    // Update overall progress
    const overallProgress = Math.min((studentStats.gamesPlayed * 20), 100);
    document.getElementById('overallProgress').style.width = overallProgress + '%';
    
    // Update stats
    document.getElementById('correctAnswers').textContent = studentStats.correctAnswers;
    document.getElementById('accuracy').textContent = studentStats.accuracy + '%';
    document.getElementById('gamesPlayed').textContent = studentStats.gamesPlayed;
    
    // Update topics (mock data - in real implementation would track actual mastered topics)
    if (studentStats.gamesPlayed > 0) {
        const topics = ['Addition', 'Subtraction', 'Multiplication', 'Division'];
        const mastered = Math.min(Math.floor(studentStats.gamesPlayed / 2), topics.length);
        const masteredTopics = topics.slice(0, mastered);
        document.getElementById('topicsList').textContent = masteredTopics.length > 0 ? masteredTopics.join(', ') : 'No topics mastered yet';
    }
}

// ============ INTERACTIVE MANUAL FUNCTIONS ============

function flipPage(direction) {
    const newPage = manualState.currentPage + direction;
    
    if (newPage >= 0 && newPage < manualState.totalPages) {
        manualState.currentPage = newPage;
        updateManualDisplay();
        updateStatusPanel();
    }
}

function updateManualDisplay() {
    const manualPages = document.getElementById('manualPages');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    // Update page visibility
    const pages = manualPages.querySelectorAll('.manual-page');
    pages.forEach((page, index) => {
        if (index === manualState.currentPage * 2 || index === manualState.currentPage * 2 + 1) {
            page.style.display = 'block';
        } else {
            page.style.display = 'none';
        }
    });
    
    // Update navigation buttons
    prevBtn.style.opacity = manualState.currentPage === 0 ? '0.3' : '1';
    nextBtn.style.opacity = manualState.currentPage === manualState.totalPages - 1 ? '0.3' : '1';
}

function selectAnswer(answerElement, answer) {
    // Remove previous selection from this question
    const question = answerElement.parentElement;
    const previousSelection = question.querySelector('.selected');
    if (previousSelection) {
        previousSelection.classList.remove('selected');
        manualState.selectedAnswers.delete(previousSelection.textContent.trim());
    }
    
    // Add new selection
    answerElement.classList.add('selected');
    manualState.selectedAnswers.add(answer);
    
    // Check if answer is correct and activate corresponding module
    if (manualState.correctAnswers.has(answer)) {
        const moduleId = manualState.correctAnswers.get(answer);
        activateModule(moduleId);
        
        // Visual feedback
        answerElement.style.backgroundColor = '#00ff00';
        answerElement.style.color = '#000';
        
        // Show success message
        showModuleActivation(moduleId);
    } else {
        // Wrong answer feedback
        answerElement.style.backgroundColor = '#ff0000';
        answerElement.style.color = '#fff';
        
        setTimeout(() => {
            answerElement.style.backgroundColor = '';
            answerElement.style.color = '';
        }, 1000);
    }
}

function activateModule(moduleId) {
    const module = document.getElementById(moduleId);
    if (module) {
        // Change LED to green
        const redLed = module.querySelector('.led-red');
        const greenLed = module.querySelector('.led-green');
        
        if (redLed) redLed.style.backgroundColor = '#333';
        if (greenLed) greenLed.style.backgroundColor = '#00ff00';
        
        // Add activation effect
        module.style.borderColor = '#00ff00';
        module.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.8)';
        
        // Make module interactive
        module.classList.add('activated');
    }
}

function showModuleActivation(moduleId) {
    const moduleName = manualState.moduleMappings[moduleId] || 'Module';
    const notification = document.createElement('div');
    notification.className = 'module-notification';
    notification.textContent = `${moduleName} Activated!`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

function handleAbortClick() {
    if (confirm('Are you sure you want to abort the defusal? This will end the game.')) {
        clearInterval(bombState.timerInterval);
        bombState.isActive = false;
        
        // Reset all modules
        resetBombModules();
        
        // Show game over screen
        document.getElementById('game').classList.remove('active');
        document.getElementById('mainInterface').classList.add('active');
        
        alert('Bomb defusal aborted. Better luck next time!');
    }
}

function resetBombModules() {
    // Reset all LEDs
    const leds = document.querySelectorAll('.led');
    leds.forEach(led => {
        if (led.classList.contains('led-red')) {
            led.style.backgroundColor = '#ff0000';
        } else if (led.classList.contains('led-green')) {
            led.style.backgroundColor = '#333';
        }
    });
    
    // Reset module styles
    const modules = document.querySelectorAll('.module');
    modules.forEach(module => {
        module.style.borderColor = '';
        module.style.boxShadow = '';
        module.classList.remove('activated');
    });
    
    // Reset manual state
    manualState.selectedAnswers.clear();
    manualState.currentPage = 0;
    updateManualDisplay();
    
    // Reset answer selections
    const selectedAnswers = document.querySelectorAll('.question-answer.selected');
    selectedAnswers.forEach(answer => {
        answer.classList.remove('selected');
        answer.style.backgroundColor = '';
        answer.style.color = '';
    });
}