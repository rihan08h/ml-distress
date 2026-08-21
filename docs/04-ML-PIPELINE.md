# ML, AI & Processing Pipelines — Smart Medicine Platform

## 1. AI/ML Components Overview

This platform uses **6 distinct AI/ML pipelines** across different features:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI / ML PIPELINES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CORE PIPELINES (Used across features)                              │
│  ─────────────────────────────────────                              │
│  A. Medicine NLP Engine        — fuzzy search, name matching        │
│  B. Drug Interaction Engine    — interaction detection               │
│  C. OCR Pipeline               — prescription text extraction       │
│                                                                     │
│  PREMIUM PIPELINE (💎)                                              │
│  ─────────────────────                                              │
│  D. Symptom → Disease ML Model — XGBoost + LLM hybrid              │
│  E. NLP Symptom Extractor      — spaCy medical NER                  │
│  F. Voice STT Pipeline         — Whisper transcription              │
│                                                                     │
│  ANALYTICS PIPELINE (B2B)                                           │
│  ─────────────────────                                              │
│  G. Demand Prediction Model    — time series forecasting            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pipeline A: Medicine NLP Engine (FREE)

Powers medicine search, prescription matching, and generic recommendations.

```
User query: "paracetmol 500"  (typo)
         │
         ▼
┌──────────────────────┐
│ 1. Text Preprocessing│
│    • Lowercase       │
│    • Spell correct   │  ◀── SymSpell with medical dictionary
│    "paracetamol 500" │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. Elasticsearch     │
│    • Full-text match │
│    • Fuzzy matching  │  ◀── Levenshtein distance ≤ 2
│    • Edge n-gram     │
│    • Synonym expand  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. Rank & Filter     │
│    • Relevance score │
│    • Dosage filter   │
│    • Brand/generic   │
└──────────────────────┘
```

### Medicine Synonym Dictionary
```python
MEDICINE_SYNONYMS = {
    "paracetamol": ["acetaminophen", "tylenol", "crocin", "dolo", "calpol"],
    "ibuprofen": ["brufen", "advil", "motrin", "combiflam"],
    "amoxicillin": ["amoxil", "moxatag", "mox"],
    "cetirizine": ["zyrtec", "cetzine", "okacet"],
    # ... 5000+ mappings
}
```

---

## 3. Pipeline B: Drug Interaction Engine (FREE)

```
Input: [Medicine A, Medicine B, ...user's current meds]
         │
         ▼
┌─────────────────────────┐
│ 1. Normalize medicine   │
│    names → active       │
│    ingredients          │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 2. Pairwise lookup in   │
│    interaction database  │  ◀── PostgreSQL + Redis cache
│    O(n²) pairs          │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 3. Classify severity     │
│    • Minor              │
│    • Moderate           │
│    • Major              │  ◀── Rule-based from DrugBank data
│    • Contraindicated    │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 4. Generate warnings     │
│    & recommendations    │
└─────────────────────────┘
```

### Data Sources
| Source | Data | Records |
|--------|------|---------|
| **DrugBank** | Comprehensive drug interactions | ~15K pairs |
| **OpenFDA** | FDA adverse event reports | Supplementary |
| **RxNorm** | Drug ingredient normalization | Mapping |
| **DrugBank Open** | Open-source subset | ~3K pairs (free) |

---

## 4. Pipeline C: OCR — Prescription Scanner (FREE)

```
Prescription Image (JPEG/PNG)
         │
         ▼
┌─────────────────────────┐
│ 1. Image Preprocessing  │
│    • Resize / normalize │
│    • Deskew (rotation)  │  ◀── OpenCV
│    • Denoise            │
│    • Binarize (Otsu)    │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 2. OCR Extraction       │
│    Primary: Tesseract v5│
│    Fallback: Google     │  ◀── Cloud Vision API
│    Vision API           │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 3. Medicine NER         │
│    • Detect medicine    │
│      names in text      │  ◀── spaCy + custom medical NER
│    • Extract dosages    │      OR LLM extraction
│    • Extract frequency  │
│    • Extract duration   │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 4. Medicine Matching    │
│    • Fuzzy match to DB  │  ◀── Levenshtein + Elasticsearch
│    • Confidence score   │
│    • Handle abbreviations│     "Tab" → "Tablet"
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 5. Validation           │
│    • Verify dosages     │
│    • Check interactions │
│    • Flag uncertainties │
└─────────────────────────┘
```

### OCR Technology Decision

| Option | Pros | Cons | Use When |
|--------|------|------|----------|
| **Tesseract v5** (default) | Free, local, fast | Lower accuracy on handwriting | Typed/printed prescriptions |
| **Google Cloud Vision** | Excellent accuracy, handwriting support | Costs $1.50/1000 images | Handwritten, complex layouts |
| **LLM Vision (GPT-4V)** | Best understanding, structured output | Expensive, slower | Fallback for low-confidence |

### Prescription Parsing Prompt (LLM Fallback)
```
Analyze this prescription image and extract all medicines in JSON format:

For each medicine, provide:
- medicine_name: exact name as written  
- dosage: amount per dose (e.g., "500mg")
- frequency: how often (e.g., "twice daily")
- duration: how long (e.g., "7 days") 
- instructions: any special instructions (e.g., "after food")

Return ONLY valid JSON array. If unsure about any field, set it to null.
```

---

## 5. Pipeline D: Symptom → Disease Prediction (💎 PREMIUM)

### Hybrid Architecture

```
                    User Symptoms (parsed)
                            │
                            ▼
                  ┌─────────────────┐
                  │ Confidence Router│
                  └───┬─────────┬───┘
                      │         │
            High conf.│         │Low conf. / Complex
                      ▼         ▼
             ┌──────────┐  ┌──────────┐
             │ XGBoost  │  │ LLM API  │
             │ Model    │  │ (GPT-4/  │
             │ ~5ms     │  │ Gemini)  │
             │          │  │ ~2-5sec  │
             └────┬─────┘  └────┬─────┘
                  │              │
                  ▼              ▼
             ┌────────────────────────┐
             │   Result Aggregator    │
             │   + Risk Classifier    │
             └───────────┬────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │  Response    │
                  └─────────────┘
```

### ML Model Details

| Aspect | Detail |
|--------|--------|
| **Algorithm** | XGBoost (primary), Random Forest (baseline) |
| **Input** | Multi-hot symptom vector (132 dims) + age + gender |
| **Output** | Probability distribution over 41 disease classes |
| **Training Data** | Kaggle disease-symptom datasets (~5K+ rows) |
| **Inference Time** | ~1-5ms |
| **Model Size** | ~10MB (.joblib) / ~5MB (.onnx) |
| **Top-3 Accuracy** | Target > 92% |
| **Emergency Recall** | Target > 98% |

### Datasets

| Dataset | Source | Size | Use |
|---------|--------|------|-----|
| Disease-Symptom Mapping | Kaggle | ~5K rows | Primary training |
| Symptom2Disease | HuggingFace | ~1.2K rows | Text-based augmentation |
| Disease Prediction Dataset | Kaggle | ~4.9K rows | 132 symptoms → 41 diseases |
| Custom Curated | Manual + LLM | ~2K rows | Gap-filling |

### Hybrid Router Logic

```python
async def predict_diseases(parsed_symptoms, user_profile):
    # Step 1: Always run fast ML model
    symptom_vector = encode_symptoms(parsed_symptoms)
    ml_probs = ml_model.predict_proba(symptom_vector)
    top_confidence = ml_probs.max()
    
    # Step 2: Route based on confidence
    if top_confidence >= 0.70:
        # High confidence → ML only (fast, free)
        return format_ml_result(ml_probs, top_k=3)
    
    elif top_confidence >= 0.40:
        # Medium → ML + LLM verification
        llm_result = await call_llm(parsed_symptoms, user_profile)
        return merge_results(ml_probs, llm_result)
    
    else:
        # Low confidence → LLM primary
        llm_result = await call_llm(parsed_symptoms, user_profile)
        return format_llm_result(llm_result)
```

### Risk Level Classification

```python
EMERGENCY_SYMPTOMS = [
    "chest pain", "difficulty breathing", "severe bleeding",
    "loss of consciousness", "seizure", "stroke symptoms",
    "anaphylaxis", "sudden severe headache",
]

EMERGENCY_COMBINATIONS = [
    ("fever", "stiff neck", "confusion"),   # meningitis
    ("chest pain", "left arm pain"),         # heart attack
    ("sudden weakness", "face drooping"),    # stroke
]

def classify_risk(symptoms, ml_confidence, predictions):
    # Rule 1: Emergency symptoms always escalate
    for symptom in symptoms:
        if symptom.name in EMERGENCY_SYMPTOMS:
            return "emergency"
    
    # Rule 2: Dangerous combinations
    symptom_names = {s.name for s in symptoms}
    for combo in EMERGENCY_COMBINATIONS:
        if all(s in symptom_names for s in combo):
            return "emergency"
    
    # Rule 3: Severity + duration based
    if any(s.severity == "severe" and s.duration_days >= 3 for s in symptoms):
        return "high"
    
    # Rule 4: ML confidence on serious conditions
    for pred in predictions:
        if pred.disease in SERIOUS_CONDITIONS and pred.confidence > 0.5:
            return "high"
    
    # Rule 5: Moderate symptoms
    if any(s.severity in ("moderate", "severe") for s in symptoms):
        return "medium"
    
    return "low"
```

---

## 6. Pipeline E: NLP Symptom Extractor (💎 PREMIUM)

```
Raw: "I've had a terrible headache for 3 days with some fever"
         │
         ▼
┌──────────────────────────────┐
│ 1. Text Preprocessing        │
│    • Lowercase               │
│    • Spell correct (SymSpell)│
│    • Expand abbreviations    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 2. Medical NER (spaCy)       │
│    • en_core_sci_lg model    │
│    Extract:                  │
│    [headache] [3 days] [fever]│
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 3. Attribute Extraction      │
│    • Severity: "terrible" →  │
│      severe                  │
│    • Duration: "3 days" →    │
│      3 days                  │
│    • Body area: headache →   │
│      head                    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 4. Symptom Normalization     │
│    • Map to standard ontology│
│    • "tummy ache" →          │
│      "abdominal pain"        │
└──────────────────────────────┘
```

---

## 7. Pipeline F: Voice-to-Text (💎 PREMIUM)

```
Audio (WAV/MP3/WebM)
         │
         ▼
┌──────────────────┐    ┌──────────────────┐
│  OpenAI Whisper  │ OR │ Web Speech API   │
│  API             │    │ (browser-side)   │
│  (server-side)   │    │ (free, fast)     │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
           ┌──────────────────┐
           │ Transcribed Text │
           │ + Confidence     │
           └────────┬─────────┘
                    │
                    ▼  (feeds into NLP pipeline E)
```

- **Primary**: Web Speech API in browser (free, instant, no server cost)
- **Fallback**: OpenAI Whisper API (for audio uploads, $0.006/min)
- **Max audio**: 60 seconds
- **Languages**: English (primary), Hindi (future)
- **Confidence threshold**: < 0.7 → ask user to re-record or type

---

## 8. Pipeline G: Medicine Demand Prediction (B2B)

```
Historical Data (pharmacy_inventory + demand_tracking)
         │
         ▼
┌──────────────────────────┐
│ 1. Feature Engineering   │
│    • Daily sales volume  │
│    • Day of week/month   │
│    • Seasonal indicators │
│    • Disease outbreak    │
│      signals (symptom    │
│      checker aggregates) │
│    • Weather data        │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 2. Time Series Model     │
│    • Prophet (primary)   │  ◀── Meta's Prophet for seasonality
│    • ARIMA (baseline)    │
│    • XGBoost (features)  │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 3. Alerts Generator      │
│    • Low stock alert     │
│    • Seasonal surge      │
│    • Restock quantity    │
│    • Shortage prediction │
└──────────────────────────┘
```

### Demand Prediction Features

| Feature | Source | Type |
|---------|--------|------|
| `daily_units_sold` | demand_tracking | Numeric |
| `day_of_week` | Calendar | Categorical |
| `month` | Calendar | Categorical |
| `is_holiday` | Holiday calendar | Boolean |
| `season` | Calendar | Categorical |
| `avg_temperature` | Weather API | Numeric |
| `flu_index` | Symptom checker aggregate | Numeric |
| `days_since_restock` | inventory | Numeric |
| `nearby_pharmacy_stock` | pharmacy_network | Numeric |

---

## 9. Model Training & Serving

### Training Pipeline (ML models)

```
ml/
├── data/
│   ├── raw/                  # Original datasets
│   ├── processed/            # Cleaned & encoded
│   └── augmented/            # Augmented training data
├── models/
│   ├── symptom_classifier_v1.joblib
│   ├── symptom_classifier_v1.onnx
│   ├── demand_predictor_v1.joblib
│   └── model_metadata.json
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_preprocessing.ipynb
│   ├── 03_model_training.ipynb
│   ├── 04_evaluation.ipynb
│   └── 05_demand_prediction.ipynb
├── src/
│   ├── data_pipeline.py
│   ├── feature_engineering.py
│   ├── train_symptom_model.py
│   ├── train_demand_model.py
│   ├── evaluate.py
│   └── export_onnx.py
└── configs/
    └── training_config.yaml
```

### Model Serving Strategy

| Stage | Strategy | Latency |
|-------|----------|---------|
| **MVP** | joblib model loaded in FastAPI process memory | ~5ms |
| **Growth** | ONNX Runtime for optimized inference | ~1-2ms |
| **Scale** | Triton Inference Server / dedicated ML service | ~1ms + network |

### Evaluation Metrics

| Model | Metric | Target |
|-------|--------|--------|
| Symptom Classifier | Top-3 Accuracy | > 92% |
| Symptom Classifier | Emergency Recall | > 98% |
| Symptom Classifier | F1 (macro) | > 0.80 |
| Symptom Classifier | Inference Time | < 50ms |
| Demand Predictor | MAPE (30-day) | < 20% |
| OCR Pipeline | Character Accuracy | > 90% (typed), > 75% (handwritten) |
| Medicine Matcher | Match Accuracy | > 95% |
