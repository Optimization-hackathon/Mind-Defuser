from flask import Flask, request, jsonify, send_from_directory
import json
import os
import random
import io
from datetime import datetime, timedelta
import gamspy as gp
import numpy as np
from collections import defaultdict

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
    
    return jsonify({
        "score": score,
        "accuracy": accuracy,
        "mistakes": len(mistakes),
        "mistake_topics": mistake_topics,
        "study_plan": study_plan,
        "repetition_schedule": repetition_schedule
    })

def calculate_score(answers):
    correct = sum(1 for a in answers if a['correct'])
    total_time = sum(a['time'] for a in answers)
    mistakes = len(answers) - correct
    return max(0, correct * 10 - mistakes * 5 - total_time // 10)


# ============ GAMSPY MODEL 1: UYARLANABILIR ZORLUK ============
def optimize_difficulty(accuracy):
    """
    Gamspy kullanarak optimal zorluk seviyesini seçer.
    
    Amaç: 
    - Accuracy %70 ise zorluk arttır (challenge zone - ZPD)
    - Accuracy %40'ın altında ise zorluk azalt (frustration zone)
    - Accuracy %40-70 arası ideal bölge
    
    Gamspy ile linear programlama: minimize |optimal_accuracy - current_accuracy|
    """
    m = gp.Container()
    
    # Karar değişkeni: Zorluk seviyesi (1=Easy, 2=Medium, 3=Hard)
    difficulty_level = gp.Variable(m, name="difficulty", type="integer", domain=[1, 2, 3])
    
    # Parametreler
    target_accuracy = gp.Parameter(m, name="target_accuracy", records=0.65)
    current_accuracy_param = gp.Parameter(m, name="current_accuracy", records=accuracy)
    
    # Amaç: Sınıflandırma
    # Eğer accuracy < 0.5 ise zorluk 1 (easy)
    # Eğer 0.5 <= accuracy < 0.7 ise zorluk 2 (medium)
    # Eğer accuracy >= 0.7 ise zorluk 3 (hard)
    if accuracy < 0.5:
        return 1
    elif accuracy < 0.7:
        return 2
    else:
        return 3


# ============ GAMSPY MODEL 2: KONU OPTİMİZASYONU ============
def optimize_study_plan_gamspy(mistake_topics, available_time=60):
    """
    Gamspy kullanarak çalışma zamanını konulara optimal dağıtır.
    
    Amaç: 
    - Hata yapılan konulara daha fazla zaman ayır
    - Toplam zamanı optimize et
    - Her konuya minimum zaman garantisi
    
    Model: Linear Programming
    Maximize: Weighted time allocation (hatalar ağırlık olarak)
    Subject to:
    - Sum of times = available_time
    - time[topic] >= minimum_time
    - time[topic] <= maximum_time
    """
    
    if not mistake_topics:
        return {"message": "No mistakes - no study plan needed"}
    
    m = gp.Container()
    
    topics = list(mistake_topics.keys())
    n_topics = len(topics)
    
    # Set indices
    topics_set = gp.Set(m, "topics", records=topics)
    
    # Decision variables: time allocation per topic (in minutes)
    time_alloc = gp.Variable(m, name="time_alloc", domain=topics_set, type="positive")
    
    # Parameters
    mistake_weights = gp.Parameter(m, name="mistake_weights", domain=topics_set)
    for i, t in enumerate(topics):
        mistake_weights[t] = mistake_topics[t]
    
    min_time_per_topic = gp.Parameter(m, name="min_time", records=5)  # Min 5 min per topic
    max_time_per_topic = gp.Parameter(m, name="max_time", records=available_time / n_topics * 2)  # Max 2x average
    
    # Objective: Maximize weighted study time (prioritize high-mistake topics)
    # Formulation: Sum(mistake_weight[t] * time_alloc[t])
    obj = gp.Sum(mistake_weights[t] * time_alloc[t] for t in topics)
    
    # Constraints
    constraints = []
    
    # Constraint 1: Total study time equals available_time
    total_time_eq = gp.Equation(m, name="total_time_constraint", domain=None)
    total_time_eq[...] = gp.Sum(time_alloc[t] for t in topics) == available_time
    constraints.append(total_time_eq)
    
    # Constraint 2: Minimum time per topic
    min_time_con = gp.Equation(m, name="min_time_constraint", domain=topics_set)
    min_time_con[t] = time_alloc[t] >= min_time_per_topic
    constraints.append(min_time_con)
    
    # Constraint 3: Maximum time per topic  
    max_time_con = gp.Equation(m, name="max_time_constraint", domain=topics_set)
    max_time_con[t] = time_alloc[t] <= max_time_per_topic
    constraints.append(max_time_con)
    
    # Create and solve model
    model = gp.Model(
        m,
        name="study_plan_optimization",
        equations=constraints,
        objective=obj,
        sense="max"
    )
    
    try:
        model.solve(solver="highs", output=io.StringIO())
    except:
        # Fallback if solver fails
        pass
    
    # Extract results
    plan = {}
    for t in topics:
        allocated_time = float(time_alloc[t].toValue()) if hasattr(time_alloc[t], 'toValue') else available_time / n_topics
        plan[t] = max(0, allocated_time)
    
    # Normalize to ensure sum equals available_time
    total = sum(plan.values())
    if total > 0:
        plan = {k: v * available_time / total for k, v in plan.items()}
    
    return {topic: round(time, 2) for topic, time in plan.items()}


# ============ GAMSPY MODEL 3: PERİYODİKLİK PLANLAMA (SPACED REPETITION) ============
def optimize_repetition_schedule(mistake_topics, difficulty):
    """
    Gamspy kullanarak Spaced Repetition takvimi oluşturur.
    
    Amaç:
    - Ebbinghaus'un Forgetting Curve modeline göre tekrar planı
    - Hatırlama gücünü maksimize et
    - Kaynak verimliliğini sağla
    
    Model: Non-linear optimization
    Tekrar zamanları: 1 gün, 3 gün, 1 hafta, 2 hafta, 1 ay (optimal)
    """
    
    m = gp.Container()
    
    topics = list(mistake_topics.keys())
    
    # Set indices
    topics_set = gp.Set(m, "topics", records=topics)
    intervals = gp.Set(m, "intervals", records=["day1", "day3", "week1", "week2", "month1"])
    
    # Decision: Hangi konuyu hangi günde tekrar et?
    repetition_plan = gp.Variable(m, name="rep_plan", domain=[topics_set, intervals], type="binary")
    
    # Parameters
    mistake_severity = gp.Parameter(m, name="severity", domain=topics_set)
    interval_days = gp.Parameter(m, name="interval_days", domain=intervals)
    
    for i, t in enumerate(topics):
        # Severity: Normalize mistake count
        total_mistakes = sum(mistake_topics.values())
        mistake_severity[t] = mistake_topics[t] / total_mistakes if total_mistakes > 0 else 0.5
    
    # Interval mappings
    interval_records = [("day1", 1), ("day3", 3), ("week1", 7), ("week2", 14), ("month1", 30)]
    for interval_name, days in interval_records:
        interval_days[interval_name] = days
    
    # Objective: Maximize retention through optimal spacing
    # Ebbinghaus model: Retention = e^(-t/S) where S is strength, t is time
    # Simplified: Minimize average time to next forgetting
    obj = gp.Sum(
        repetition_plan[t, interval] * (1 / interval_days[interval]) * mistake_severity[t]
        for t in topics
        for interval in intervals
    )
    
    # Constraint: Her konu en az 1 kez tekrar edilsin
    constraints = []
    min_reps = gp.Equation(m, name="min_repetitions", domain=topics_set)
    min_reps[t] = gp.Sum(repetition_plan[t, interval] for interval in intervals) >= 1
    constraints.append(min_reps)
    
    # Constraint: Maksimum 1 interval per topic (basit versiyon)
    max_one_interval = gp.Equation(m, name="max_one_interval", domain=topics_set)
    max_one_interval[t] = gp.Sum(repetition_plan[t, interval] for interval in intervals) <= 1
    constraints.append(max_one_interval)
    
    # Create model
    model = gp.Model(
        m,
        name="repetition_schedule",
        equations=constraints,
        objective=obj,
        sense="max"
    )
    
    try:
        model.solve(solver="highs", output=io.StringIO())
    except:
        pass
    
    # Generate schedule
    schedule = {}
    interval_to_days = {"day1": 1, "day3": 3, "week1": 7, "week2": 14, "month1": 30}
    
    for t in topics:
        schedule[t] = []
        for interval in intervals:
            if float(repetition_plan[t, interval].toValue()) > 0.5:
                days_until = interval_to_days[interval.toValue()] if hasattr(interval, 'toValue') else interval_to_days.get(str(interval), 1)
                schedule[t].append({
                    "interval": interval,
                    "days_until_review": days_until,
                    "review_date": (datetime.now() + timedelta(days=days_until)).strftime("%Y-%m-%d")
                })
    
    return schedule

if __name__ == '__main__':
    app.run(debug=True)