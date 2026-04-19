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
    const difficulty = document.getElementById('gameDifficulty').value;
    const subject = document.getElementById('gameSubject').value;
    const moduleCount = parseInt(document.getElementById('moduleCount').value, 10);
    
    try {
        const response = await fetch('/api/get_questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                difficulty: difficulty,
                subject: subject,
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
    updateModules();
}

function updateModules() {
    const modulesDiv = document.getElementById('modules');
    modulesDiv.innerHTML = '';
    for (let i = 0; i < questions.length; i++) {
        const module = document.createElement('div');
        module.className = 'module';
        if (i < currentQuestionIndex) {
            module.classList.add('defused');
        }
        modulesDiv.appendChild(module);
    }
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
            `💡 Gamspy AI sistem ${weakTopics.length} zayıf konu belirledi ve çalışma planı oluşturdu!`
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
    document.getElementById('game').classList.remove('active');
    document.getElementById('mainInterface').classList.add('active');
}

// ============ CHAT FUNCTIONS ============
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addUserMessage(message);
    input.value = '';
    
    // Simulate AI response (in real implementation, this would call an API)
    setTimeout(() => {
        const responses = [
            "Bu soruyu çözmek için önce problemi dikkatli oku. Hangi matematik konsepti kullanılıyor?",
            "Güzel soru! Bir önceki cevabını gözden geçir. Hesaplamalarında bir hata olmuş olabilir.",
            "Devam et, seni çok iyi yapıyor görüyorum! Zorlanıyorsan, sorunun temel kavramını düşün.",
            "Başka bir yaklaşım denemeye çalış. Resmi adım adım çız, yardımcı olabilir!",
            "Mükemmel! Konsepti çok iyi anlamışsın. Daha karmaşık soruları dene!",
            "Hata yapmak normal bir parça! Neden yanlış olduğunu anlamaya çalış, bu önemli.",
            "Bu konuda iyi ilerliyorsun. Pratik yapıp pratik yap, her şey zamanla gelecek!",
            "Eğer takılıyorsan, temel adımları gözden geçirmeyi dene. Bazen basit şeyler atlanabiliyor."
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addAIMessage(randomResponse);
    }, 800);
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