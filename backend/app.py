import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


from werkzeug.utils import secure_filename
import pdfplumber
from docx import Document
# from sentence_transformers import SentenceTransformer, util
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)
# Initialize NLP model
nlp = spacy.load("en_core_web_sm")

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'docx'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# File type check
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Extract text from PDF
def extract_text_from_pdf(file_path):
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

# Extract text from DOCX
def extract_text_from_docx(file_path):
    doc = Document(file_path)
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    return text

# NLP analysis function
def analyze_resume_nlp(resume_text, job_description):
    def preprocess(text):
        doc = nlp(text.lower())
        return ' '.join([token.lemma_ for token in doc if token.is_alpha and not token.is_stop])

    resume_clean = preprocess(resume_text)
    jd_clean = preprocess(job_description)


    # TF-IDF vectorization
    vectorizer = TfidfVectorizer()
    vectors = vectorizer.fit_transform([resume_clean, jd_clean])
    similarity_score = cosine_similarity(vectors[0:1], vectors[1:2])[0][0] * 100


    # Keyword comparison
    resume_keywords = set(resume_clean.split())
    jd_keywords = set(jd_clean.split())
    missing_keywords = list(jd_keywords - resume_keywords)


    return {
        "similarity_score": round(similarity_score, 2),
        "missing_keywords": missing_keywords,
        "summary": f"Resume matches {round(similarity_score, 2)}% with job description.",
        "suggestion": f"Consider including: {', '.join(missing_keywords[:10])}" if missing_keywords else "Excellent keyword match!"
    }


# Route to analyze resume
@app.route('/analyze', methods=['POST'])
def analyze_resume():
    if 'resume' not in request.files:
        return jsonify({'error': 'No resume file uploaded'}), 400

    file = request.files['resume']
    job_description = request.form.get('jobDescription', '')

    if not job_description:
        return jsonify({'error': 'No job description provided'}), 400

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            if filename.endswith('.pdf'):
                resume_text = extract_text_from_pdf(file_path)
            else:
                resume_text = extract_text_from_docx(file_path)

            os.remove(file_path)

            analysis = analyze_resume_nlp(resume_text, job_description)
            # print(analysis);
            return jsonify(analysis)

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'Invalid file type'}), 400

# Run the app
if __name__ == '__main__':
    app.run(debug=True)
