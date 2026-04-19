from flask import Flask, request, jsonify, send_from_directory
import json
import os
import random
import io
from openai import OpenAI
from flask import request, jsonify
from datetime import datetime, timedelta
# import gamspy as gp
# import numpy as np
from collections import defaultdict
import openai

app = Flask(__name__)



# Load questions from a JSON file
QUESTIONS_FILE = 'questions.json'
STUDENT_PERFORMANCE_FILE = 'student_performance.json'

def load_questions():
    if os.path.exists(QUESTIONS_FILE):
        with open(QUESTIONS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_questions(questions):
    with open(QUESTIONS_FILE, 'w') as f:
        json.dump(questions, f, indent=4)

def load_student_performance():
    if os.path.exists(STUDENT_PERFORMANCE_FILE):
        with open(STUDENT_PERFORMANCE_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_student_performance(data):
    with open(STUDENT_PERFORMANCE_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def get_ai_feedback(weak_topics, correct_answers, wrong_answers, total_time):
    """
    Generate personalized AI feedback using OpenAI API.
    """
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return "Keep practicing your weak topics and try again!"
    
    client = openai.OpenAI(api_key=api_key)
    
    # Convert total_time to minutes for readability
    time_minutes = total_time / 60 if total_time > 60 else total_time
    time_unit = "seconds" if total_time <= 60 else "minutes"
    
    prompt = f"""You are a helpful tutor.

Student performance:
- Weak topics: {', '.join(weak_topics) if weak_topics else 'None'}
- Correct answers: {correct_answers}
- Wrong answers: {wrong_answers}
- Time spent: {time_minutes:.1f} {time_unit}

Give personalized study advice and explain what the student should focus on.
Keep it short and motivating."""
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Using gpt-3.5-turbo as gpt-5.3 doesn't exist
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.7
        )
        feedback = response.choices[0].message.content.strip()
        return feedback
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "Keep practicing your weak topics and try again!"

# Initialize with some sample questions if not exist
if not os.path.exists(QUESTIONS_FILE):
    sample_questions = {
        "Grade 5": {
            "arithmetic": [
                {"question": "What is 5 + 3?", "answer": "8", "topic": "arithmetic", "difficulty": 1},
                {"question": "What is 10 - 4?", "answer": "6", "topic": "arithmetic", "difficulty": 1},
                {"question": "What is 25 / 5?", "answer": "5", "topic": "arithmetic", "difficulty": 2}
            ],
            "fractions": [
                {"question": "What is 1/2 + 1/2?", "answer": "1", "topic": "fractions", "difficulty": 1},
                {"question": "Simplify 2/4", "answer": "1/2", "topic": "fractions", "difficulty": 2},
                {"question": "What is 1/3 + 1/6?", "answer": "1/2", "topic": "fractions", "difficulty": 3}
            ],
            "algebra": [
                {"question": "Solve x + 2 = 5", "answer": "3", "topic": "algebra", "difficulty": 1},
                {"question": "Solve 2x = 10", "answer": "5", "topic": "algebra", "difficulty": 2}
            ],
            "geometry": [
                {"question": "How many sides does a triangle have?", "answer": "3", "topic": "geometry", "difficulty": 1},
                {"question": "What is area of square with side 4?", "answer": "16", "topic": "geometry", "difficulty": 2}
            ]
        },
        "Grade 6": {
            "arithmetic": [
                {"question": "What is 12 * 7?", "answer": "84", "topic": "arithmetic", "difficulty": 2},
                {"question": "What is 144 / 12?", "answer": "12", "topic": "arithmetic", "difficulty": 2}
            ],
            "fractions": [
                {"question": "What is 3/4 - 1/4?", "answer": "1/2", "topic": "fractions", "difficulty": 2},
                {"question": "What is 2/3 * 3/4?", "answer": "1/2", "topic": "fractions", "difficulty": 3}
            ],
            "algebra": [
                {"question": "Solve 2x = 10", "answer": "5", "topic": "algebra", "difficulty": 2},
                {"question": "Solve 3x - 5 = 10", "answer": "5", "topic": "algebra", "difficulty": 3}
            ],
            "geometry": [
                {"question": "Area of rectangle 5x3", "answer": "15", "topic": "geometry", "difficulty": 2},
                {"question": "What is volume of cube 2x2x2?", "answer": "8", "topic": "geometry", "difficulty": 3}
            ]
        }
    }
    save_questions(sample_questions)

questions = load_questions()
student_performance = load_student_performance()

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def catch_all(path):
    if os.path.exists(os.path.join('static', path)):
        return send_from_directory('static', path)
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

@app.route('/api/get_questions', methods=['POST'])
def get_questions():
    """
    Gamspy Model 1: UYARLANABILIR ZORLUK
    Öğrencinin geçmiş performansına göre optimal zorluk seviyesi seçer
    """
    data = request.json
    difficulty_grade = data['difficulty']
    student_id = data.get('student_id', 'unknown')
    num_questions = data.get('num_questions', 5)
    
    if difficulty_grade not in questions:
        return jsonify({"error": "Difficulty not found"}), 404
    
    # Get student's past performance
    perf = student_performance.get(student_id, {})
    accuracy = perf.get('accuracy', 0.5)  # Default 50%
    
    # Gamspy Model: Optimal difficulty selection
    optimal_difficulty = optimize_difficulty(accuracy)
    
    # Get questions at optimal difficulty
    all_q = []
    for topic in questions[difficulty_grade]:
        for q in questions[difficulty_grade][topic]:
            if q.get('difficulty', 2) == optimal_difficulty:
                all_q.append(q)
    
    # If not enough questions at optimal level, expand search
    if len(all_q) < num_questions:
        for topic in questions[difficulty_grade]:
            for q in questions[difficulty_grade][topic]:
                if q not in all_q:
                    all_q.append(q)
    
    selected = random.sample(all_q, min(num_questions, len(all_q)))
    return jsonify({
        "questions": selected,
        "selected_difficulty": optimal_difficulty,
        "student_accuracy": accuracy
    })

@app.route('/api/submit_session', methods=['POST'])
def submit_session():
    """
    Gamspy Model 2 & 3: KONU OPTİMİZASYONU + PERİYODİKLİK PLANLAMA
    Hatalar analiz edilerek optimal çalışma planı oluşturulur
    """
    data = request.json
    difficulty = data['difficulty']
    answers = data['answers']  # list of {question, user_answer, correct, time, topic}
    student_id = data.get('student_id', 'unknown')
    
    mistakes = [a for a in answers if not a['correct']]
    
    # Categorize mistakes by topic
    mistake_topics = {}
    for m in mistakes:
        topic = m['topic']
        if topic not in mistake_topics:
            mistake_topics[topic] = 0
        mistake_topics[topic] += 1
    
    # Update student performance
    correct = sum(1 for a in answers if a['correct'])
    accuracy = correct / len(answers) if answers else 0
    
    if student_id not in student_performance:
        student_performance[student_id] = {
            "accuracy": accuracy,
            "topics": {},
            "study_schedule": {}
        }
    else:
        # Update running average
        old_acc = student_performance[student_id]['accuracy']
        student_performance[student_id]['accuracy'] = 0.7 * accuracy + 0.3 * old_acc
    
    save_student_performance(student_performance)
    
    # Model 2: Optimize topic allocation with Gamspy
    study_plan = optimize_study_plan_gamspy(mistake_topics, available_time=60)
    
    # Model 3: Generate spaced repetition schedule with Gamspy
    repetition_schedule = optimize_repetition_schedule(mistake_topics, difficulty)
    
    score = calculate_score(answers)
    
    # Generate AI feedback
    weak_topics = list(mistake_topics.keys())
    correct_answers = correct
    wrong_answers = len(mistakes)
    total_time = sum(a['time'] for a in answers)
    feedback = get_ai_feedback(weak_topics, correct_answers, wrong_answers, total_time)
    
    return jsonify({
        "score": score,
        "accuracy": accuracy,
        "mistakes": len(mistakes),
        "mistake_topics": mistake_topics,
        "study_plan": study_plan,
        "repetition_schedule": repetition_schedule,
        "feedback": feedback
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    AI-powered chat endpoint using OpenAI API
    """
    data = request.json
    user_message = data.get('message', '')
    student_id = data.get('student_id', 'unknown')
    
    if not user_message:
        return jsonify({"error": "No message provided"}), 400
    
    # Get student's performance context
    perf = student_performance.get(student_id, {})
    accuracy = perf.get('accuracy', 0.5)
    
    # Create context-aware prompt
    prompt = f"""You are a helpful math tutor for a gamified learning app called Mind Defuser.

Student Context:
- Current accuracy: {accuracy * 100:.1f}%
- Student message: "{user_message}"

Provide helpful, encouraging guidance about math concepts. Keep responses concise and student-friendly.
If they ask about specific math problems, guide them step-by-step without giving direct answers.
Focus on building understanding and confidence."""

    try:
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.7
        )
        ai_response = response.choices[0].message.content.strip()
        return jsonify({"response": ai_response})
    except Exception as e:
        print(f"OpenAI Chat API error: {e}")
        # Fallback responses
        fallbacks = [
            "Bu soruyu çözmek için önce problemi dikkatli oku. Hangi matematik konsepti kullanılıyor?",
            "Güzel soru! Bir önceki cevabını gözden geçir. Hesaplamalarında bir hata olmuş olabilir.",
            "Devam et, seni çok iyi yapıyor görüyorum! Zorlanıyorsan, sorunun temel kavramını düşün.",
            "Başka bir yaklaşım denemeye çalış. Resmi adım adım çiz, yardımcı olabilir!",
            "Mükemmel! Konsepti çok iyi anlamışsın. Daha karmaşık soruları dene!",
            "Hata yapmak normal bir parça! Neden yanlış olduğunu anlamaya çalış, bu önemli.",
            "Bu konuda iyi ilerliyorsun. Pratik yapıp pratik yap, her şey zamanla gelecek!",
            "Eğer takılıyorsan, temel adımları gözden geçirmeyi dene. Bazen basit şeyler atlanabiliyor."
        ]
        import random
        return jsonify({"response": random.choice(fallbacks)})

def calculate_score(answers):
    correct = sum(1 for a in answers if a['correct'])
    total_time = sum(a['time'] for a in answers)
    mistakes = len(answers) - correct
    return max(0, correct * 10 - mistakes * 5 - total_time // 10)


# ============ GAMSPY MODEL 1: UYARLANABILIR ZORLUK ============
def optimize_difficulty(accuracy):
    """
    Simple rule-based difficulty optimization.
    
    - Accuracy < 50%: Easy (1)
    - Accuracy 50-70%: Medium (2) 
    - Accuracy > 70%: Hard (3)
    """
    if accuracy < 0.5:
        return 1
    elif accuracy < 0.7:
        return 2
    else:
        return 3


# ============ GAMSPY MODEL 2: KONU OPTİMİZASYONU ============
def optimize_study_plan_gamspy(mistake_topics, available_time=60):
    """
    Simple rule-based study plan optimization.
    Allocate more time to topics with more mistakes.
    """
    if not mistake_topics:
        return {}

    total_mistakes = sum(mistake_topics.values())
    plan = {}

    for topic, mistakes in mistake_topics.items():
        # Allocate time proportional to mistakes
        time_allocation = (mistakes / total_mistakes) * available_time
        plan[topic] = max(5, round(time_allocation, 1))  # Minimum 5 minutes

    return plan
# ============ GAMSPY MODEL 3: PERİYODİKLİK PLANLAMA (SPACED REPETITION) ============
def optimize_repetition_schedule(mistake_topics, difficulty):
    """
    Simple spaced repetition schedule based on Ebbinghaus forgetting curve.
    """
    schedule = {}
    intervals = [1, 3, 7, 14, 30]  # days

    for topic in mistake_topics.keys():
        schedule[topic] = []
        for i, days in enumerate(intervals):
            review_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
            schedule[topic].append({
                "interval": f"day{days}" if days < 7 else f"week{days//7}" if days < 30 else "month1",
                "review_date": review_date,
                "days_until_review": days
            })

    return schedule

if __name__ == '__main__':
    app.run(debug=True)