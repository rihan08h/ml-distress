/**
 * Chatbot engine for symptom checking / conversational health assistant.
 * Derived from the Symptom-Checker-Chatbot LSTM intent data.
 * Provides both a structured symptom→disease analysis and
 * a conversational chat interface.
 */

export interface ChatMessage {
  role: "user" | "bot";
  text: string;
  data?: ChatResponseData;
}

export interface ChatResponseData {
  type: "greeting" | "info" | "diagnosis" | "precaution" | "followup" | "not_understood";
  tag?: string;
  disease?: string;
  confidence?: number;
  riskLevel?: string;
  precautions?: string[];
  firstAid?: string[];
}

interface IntentEntry {
  tag: string;
  keywords: string[];      // lowercased, trimmed symptom keywords extracted from patterns
  response: string;        // clean text (HTML stripped)
  precaution: string;      // clean text
  riskLevel: string;
  firstAid: string[];      // extracted action items from response
  precautionItems: string[]; // extracted items from precaution
}

// --- Intent knowledge base (converted from intents.json) ---

const INTENTS: IntentEntry[] = [
  // Conversational intents are handled separately; disease intents below:
  {
    tag: "Common Cold",
    keywords: ["cold", "cough", "tiredness", "body pain", "runny nose", "sneezing", "congestion", "sore throat", "throat irritation", "loss of smell"],
    response: "You may have Common Cold — a viral upper respiratory infection causing congestion, cough, and sore throat.",
    precaution: "Wash hands frequently. Avoid close contact with infected individuals. Cover mouth and nose when sneezing/coughing. Boost immune system through healthy diet and exercise.",
    riskLevel: "low",
    firstAid: ["Get plenty of rest and stay hydrated", "Take over-the-counter cold medications", "Use a humidifier for congestion", "If symptoms worsen, consult a doctor"],
    precautionItems: ["Wash hands frequently", "Avoid close contact with infected individuals", "Cover mouth and nose when sneezing", "Boost immune system with healthy diet"],
  },
  {
    tag: "Fever",
    keywords: ["fever", "high temperature"],
    response: "You may have a fever. Rest and drink plenty of fluids. Call the doctor if accompanied by severe headache, stiff neck, or shortness of breath.",
    precaution: "Stay hydrated. Rest and get plenty of sleep. Use fever-reducing medications as directed. Seek medical attention if fever persists.",
    riskLevel: "low",
    firstAid: ["Rest and drink plenty of fluids", "Take paracetamol for fever", "Monitor temperature regularly", "Seek medical attention if fever persists >3 days"],
    precautionItems: ["Stay hydrated", "Rest and sleep well", "Use fever-reducing medications as directed", "Seek medical attention if persistent"],
  },
  {
    tag: "Allergies",
    keywords: ["sneezing", "itchy eyes", "runny nose", "skin rash", "watery eyes"],
    response: "You might be experiencing allergies — immune system reactions to allergens in the environment.",
    precaution: "Identify and avoid allergens. Keep indoor environments clean and dust-free. Take allergy medications as prescribed. Consider allergy shots for long-term relief.",
    riskLevel: "low",
    firstAid: ["Identify and avoid allergens if possible", "Over-the-counter antihistamines may help", "Consult an allergist for evaluation", "Keep environment clean and dust-free"],
    precautionItems: ["Identify and avoid allergens", "Keep indoor environments clean", "Take allergy medications as prescribed", "Consider allergy shots"],
  },
  {
    tag: "Asthma",
    keywords: ["shortness of breath", "wheezing", "cough", "chest tightness"],
    response: "You may have Asthma — a chronic respiratory condition that can cause breathing difficulties.",
    precaution: "Identify and avoid asthma triggers. Use prescribed inhalers and medications regularly. Create an asthma action plan. Maintain a clean and allergen-free environment.",
    riskLevel: "medium",
    firstAid: ["Use prescribed inhalers or medications as directed", "Avoid triggers (smoke, allergens)", "Consult a healthcare professional", "Sit upright and breathe slowly"],
    precautionItems: ["Identify and avoid asthma triggers", "Use prescribed inhalers regularly", "Create an asthma action plan", "Maintain clean environment"],
  },
  {
    tag: "Bronchial Asthma",
    keywords: ["cough", "fatigue", "high fever", "mucoid sputum", "breathlessness"],
    response: "You may have Bronchial Asthma — a chronic respiratory condition with fatigue, cough, high fever, and breathlessness.",
    precaution: "Follow your asthma action plan. Avoid smoke and pollutants. Use a humidifier. Exercise regularly as recommended.",
    riskLevel: "medium",
    firstAid: ["Follow asthma action plan", "Avoid smoke and pollutants", "Use a humidifier to keep air moist", "Exercise as recommended by doctor"],
    precautionItems: ["Follow asthma action plan", "Avoid smoke and pollutants", "Use humidifier", "Exercise as recommended"],
  },
  {
    tag: "Rheumatoid Arthritis",
    keywords: ["joint pain", "joint stiffness", "swelling", "fatigue"],
    response: "You may have Rheumatoid Arthritis — an autoimmune disease that affects the joints.",
    precaution: "Maintain a healthy weight. Exercise to strengthen joints. Take prescribed medications. Consider physical therapy.",
    riskLevel: "medium",
    firstAid: ["Consult a rheumatologist for diagnosis", "Medications and physical therapy can help", "Maintain healthy lifestyle with regular exercise", "Apply warm compress to affected joints"],
    precautionItems: ["Maintain healthy weight", "Exercise to strengthen joints", "Take prescribed medications", "Consider physical therapy"],
  },
  {
    tag: "Arthritis",
    keywords: ["painful walking", "movement stiffness", "muscle weakness", "stiff neck", "swelling joints"],
    response: "You may have Arthritis — a condition affecting the joints causing pain and stiffness.",
    precaution: "Maintain a healthy weight. Exercise regularly. Use joint protection techniques. Consider physical therapy.",
    riskLevel: "medium",
    firstAid: ["Seek medical advice for proper diagnosis", "Follow prescribed medications", "Manage pain with recommended treatments", "Consider lifestyle changes"],
    precautionItems: ["Maintain healthy weight", "Exercise regularly", "Use joint protection techniques", "Consider physical therapy"],
  },
  {
    tag: "HIV/AIDS",
    keywords: ["fatigue", "weight loss", "night sweats", "recurrent infections"],
    response: "You might be at risk for HIV/AIDS — a viral infection that affects the immune system.",
    precaution: "Practice safe sex. Use clean needles. Get tested regularly. Consider PrEP for high-risk individuals.",
    riskLevel: "high",
    firstAid: ["Get tested for HIV immediately", "Consult an infectious disease specialist", "Early antiretroviral therapy helps manage condition", "Practice safe sex and preventive measures"],
    precautionItems: ["Practice safe sex", "Use clean needles", "Get tested regularly", "Consider PrEP"],
  },
  {
    tag: "Ovarian Cancer",
    keywords: ["abdominal pain", "bloating", "urinary frequency", "fatigue"],
    response: "You may have symptoms consistent with Ovarian Cancer. Early detection is crucial for better outcomes.",
    precaution: "Regular gynecological check-ups and screenings. Maintain healthy diet and weight. Be aware of family history.",
    riskLevel: "high",
    firstAid: ["Consult an oncologist for diagnosis", "Surgery, chemotherapy may be needed", "Early detection is crucial", "Get regular screenings"],
    precautionItems: ["Regular gynecological check-ups", "Maintain healthy diet", "Be aware of family history", "Consider screening for high-risk individuals"],
  },
  {
    tag: "Pneumothorax",
    keywords: ["sudden chest pain", "shortness of breath", "chest tightness"],
    response: "You might be experiencing Pneumothorax — air leaks into the space between lung and chest wall.",
    precaution: "Avoid smoking. Get prompt treatment for respiratory infections. Wear seatbelts. Manage underlying lung conditions.",
    riskLevel: "emergency",
    firstAid: ["Seek immediate medical attention", "This can be a medical emergency", "Treatment may involve chest tube insertion", "Stay calm and breathe slowly"],
    precautionItems: ["Avoid smoking", "Get prompt treatment for respiratory infections", "Wear seatbelts", "Manage lung conditions"],
  },
  {
    tag: "Gout",
    keywords: ["sudden joint pain", "severe joint pain", "swelling", "redness"],
    response: "You may have Gout — a type of arthritis caused by buildup of uric acid crystals in the joints.",
    precaution: "Maintain a healthy diet and weight. Limit alcohol and high-purine foods. Stay hydrated. Take prescribed medications.",
    riskLevel: "medium",
    firstAid: ["Consult a rheumatologist", "Medications and dietary changes can help", "Rest the affected joint", "Apply ice to reduce swelling"],
    precautionItems: ["Healthy diet and weight", "Limit alcohol and high-purine foods", "Stay hydrated", "Take prescribed medications"],
  },
  {
    tag: "Chronic Fatigue Syndrome",
    keywords: ["persistent fatigue", "muscle pain", "cognitive difficulties"],
    response: "You may be experiencing Chronic Fatigue Syndrome (CFS) — long-term, unexplained fatigue.",
    precaution: "Manage stress and get adequate rest. Gradually increase physical activity. Consider cognitive-behavioral therapy. Maintain balanced diet.",
    riskLevel: "medium",
    firstAid: ["Consult a healthcare professional", "Lifestyle changes and pacing help", "Gradually increase activity", "Get adequate rest"],
    precautionItems: ["Manage stress", "Gradual physical activity", "Cognitive-behavioral therapy", "Balanced diet"],
  },
  {
    tag: "Hypertension",
    keywords: ["high blood pressure", "headache", "dizziness", "chest pain"],
    response: "You may have Hypertension (High Blood Pressure) — the force of blood against artery walls is too high.",
    precaution: "Reduce salt intake. Maintain healthy diet and exercise. Limit alcohol. Take prescribed blood pressure medications.",
    riskLevel: "high",
    firstAid: ["Sit down and rest immediately", "Measure blood pressure if possible", "Seek immediate medical attention", "Take prescribed medications"],
    precautionItems: ["Reduce salt intake", "Healthy diet and exercise", "Limit alcohol", "Take prescribed medications"],
  },
  {
    tag: "Type 2 Diabetes",
    keywords: ["excessive thirst", "frequent urination", "fatigue", "blurred vision"],
    response: "You might have Type 2 Diabetes — a chronic condition affecting glucose processing.",
    precaution: "Maintain healthy diet and weight. Exercise regularly. Monitor blood sugar levels. Take prescribed medications.",
    riskLevel: "medium",
    firstAid: ["Consult a healthcare professional", "Manage blood sugar through diet and exercise", "Monitor glucose levels regularly", "Follow prescribed medication routine"],
    precautionItems: ["Healthy diet and weight", "Exercise regularly", "Monitor blood sugar", "Take prescribed medications"],
  },
  {
    tag: "Diabetes",
    keywords: ["irregular sugar level", "increased appetite", "restlessness", "weight loss", "polyuria", "blurred vision", "lethargy", "excessive hunger"],
    response: "You may have Diabetes — a metabolic disorder with fatigue, weight loss, and excessive hunger.",
    precaution: "Maintain healthy diet. Exercise regularly. Monitor blood sugar. Take prescribed medications.",
    riskLevel: "medium",
    firstAid: ["Consult endocrinologist", "Maintain healthy lifestyle", "Monitor blood sugar levels", "Adhere to treatment plan"],
    precautionItems: ["Healthy diet and weight", "Exercise regularly", "Monitor blood sugar", "Take prescribed medications"],
  },
  {
    tag: "Osteoarthritis",
    keywords: ["painful walking", "hip joint pain", "joint pain", "neck pain", "knee pain", "swelling joints", "stiffness", "reduced range of motion"],
    response: "You may have Osteoarthritis — a degenerative joint disease causing pain and stiffness.",
    precaution: "Maintain healthy weight. Exercise to strengthen joints. Use joint protection techniques. Consider physical therapy.",
    riskLevel: "medium",
    firstAid: ["Consult healthcare professional", "Physical therapy and pain management help", "Lifestyle changes to alleviate symptoms", "Apply heat/cold to affected joints"],
    precautionItems: ["Maintain healthy weight", "Exercise for joint health", "Use joint protection", "Consider physical therapy"],
  },
  {
    tag: "Migraine",
    keywords: ["severe headache", "nausea", "sensitivity to light", "sensitivity to sound"],
    response: "You might be experiencing a Migraine — intense, throbbing headaches often with visual disturbances.",
    precaution: "Identify and avoid triggers. Keep a headache diary. Take prescribed medications. Manage stress and get enough sleep.",
    riskLevel: "medium",
    firstAid: ["Rest in a dark, quiet room", "Apply cold pack to forehead", "Take prescribed migraine medication", "Stay hydrated"],
    precautionItems: ["Identify and avoid triggers", "Keep headache diary", "Take prescribed medications", "Manage stress and sleep"],
  },
  {
    tag: "GERD",
    keywords: ["stomach pain", "acidity", "chest pain", "vomiting", "heartburn", "ulcers on tongue"],
    response: "You may have GERD (Gastroesophageal Reflux Disease) — a digestive disorder.",
    precaution: "Maintain healthy weight. Avoid trigger foods. Elevate head of bed. Take prescribed medications.",
    riskLevel: "low",
    firstAid: ["Consult a doctor for diagnosis", "Diet and weight management help", "Medications can provide relief", "Elevate head of bed to reduce reflux"],
    precautionItems: ["Maintain healthy weight", "Avoid trigger foods and drinks", "Elevate head of bed", "Take prescribed medications"],
  },
  {
    tag: "Urinary Tract Infection",
    keywords: ["painful urination", "frequent urination", "cloudy urine", "abdominal pain", "burning urination"],
    response: "You may have a Urinary Tract Infection (UTI) — a bacterial infection of the urinary system.",
    precaution: "Stay hydrated. Urinate regularly. Wipe front to back. Urinate before and after sexual activity.",
    riskLevel: "low",
    firstAid: ["Consult healthcare professional", "Antibiotics are commonly prescribed", "Drink plenty of water", "Practice good hygiene to prevent future infections"],
    precautionItems: ["Stay hydrated", "Urinate regularly", "Wipe front to back", "Good hygiene practices"],
  },
  {
    tag: "Depression",
    keywords: ["persistent sadness", "loss of interest", "fatigue", "changes in sleep", "no sleep"],
    response: "You might be experiencing Depression — a mood disorder with persistent feelings of sadness.",
    precaution: "Seek help from mental health professional. Build support system. Regular physical activity. Stress reduction techniques.",
    riskLevel: "medium",
    firstAid: ["Consult a mental health professional", "Psychotherapy and medications can help", "Build a support system", "Engage in regular physical activity"],
    precautionItems: ["Seek professional help", "Build support system", "Regular physical activity", "Stress reduction techniques"],
  },
  {
    tag: "Anxiety",
    keywords: ["excessive worry", "restlessness", "palpitations", "muscle tension"],
    response: "You may have Anxiety — excessive worry and heightened stress.",
    precaution: "Practice relaxation techniques. Challenge anxious thoughts. Seek support from therapist. Consider medication if recommended.",
    riskLevel: "medium",
    firstAid: ["Consult a mental health professional", "Therapy and lifestyle changes help", "Practice deep breathing exercises", "Identify and manage triggers"],
    precautionItems: ["Practice relaxation techniques", "Challenge anxious thoughts", "Seek therapist support", "Consider medication if recommended"],
  },
  {
    tag: "COPD",
    keywords: ["shortness of breath", "chronic cough", "wheezing", "chest tightness"],
    response: "You may have COPD (Chronic Obstructive Pulmonary Disease) — progressive lung disease.",
    precaution: "Quit smoking. Use prescribed inhalers. Avoid lung irritants. Engage in pulmonary rehabilitation.",
    riskLevel: "high",
    firstAid: ["Consult a healthcare professional", "Use prescribed inhalers", "Avoid lung irritants and pollutants", "Engage in pulmonary rehabilitation"],
    precautionItems: ["Quit smoking", "Use prescribed inhalers", "Avoid lung irritants", "Pulmonary rehabilitation"],
  },
  {
    tag: "Chronic Cholestasis",
    keywords: ["loss of appetite", "itching", "abdominal pain", "yellowish skin", "vomiting", "nausea", "yellowing of eyes"],
    response: "You may have Chronic Cholestasis — a condition affecting the liver and bile ducts.",
    precaution: "Manage underlying liver conditions. Follow liver-healthy diet. Avoid excessive alcohol. Take prescribed medications.",
    riskLevel: "high",
    firstAid: ["Consult a doctor for diagnosis", "Medications may manage symptoms", "Follow dietary recommendations", "Monitor liver function regularly"],
    precautionItems: ["Manage liver conditions", "Liver-healthy diet", "Avoid alcohol", "Take prescribed medications"],
  },
  {
    tag: "Drug Reaction",
    keywords: ["stomach pain", "skin rash", "itching", "burning micturition", "spotting urination"],
    response: "You may have a Drug Reaction — adverse effects from medication.",
    precaution: "Take medications as prescribed. Report adverse reactions. Inform providers of allergies. Avoid sharing medications.",
    riskLevel: "medium",
    firstAid: ["Consult your healthcare provider immediately", "Stop the suspected medication if safe", "Report the adverse reaction", "Keep a list of all drug allergies"],
    precautionItems: ["Take medications as prescribed", "Report adverse reactions", "Inform providers of allergies", "Don't share medications"],
  },
  {
    tag: "Peptic Ulcer Disease",
    keywords: ["loss of appetite", "passage of gases", "abdominal pain", "vomiting", "indigestion", "internal itching"],
    response: "You may have Peptic Ulcer Disease — involving stomach or intestinal ulcers.",
    precaution: "Manage stress. Avoid NSAIDs. Follow healthy diet. Treat H. pylori infection if present.",
    riskLevel: "medium",
    firstAid: ["Consult a gastroenterologist", "Avoid spicy and acidic foods", "Take prescribed medications", "Eat smaller, frequent meals"],
    precautionItems: ["Manage stress", "Avoid NSAIDs", "Healthy diet, avoid spicy foods", "Treat H. pylori if present"],
  },
  {
    tag: "Cervical Spondylosis",
    keywords: ["dizziness", "back pain", "weakness in limbs", "loss of balance", "neck pain"],
    response: "You may have Cervical Spondylosis — a condition affecting the neck and spine.",
    precaution: "Maintain good posture. Exercise to strengthen neck muscles. Use ergonomic equipment. Consider physical therapy.",
    riskLevel: "medium",
    firstAid: ["Physiotherapy for neck and spine", "Use neck support devices if advised", "Maintain good posture", "Regular exercise and stretches"],
    precautionItems: ["Good posture", "Strengthen neck muscles", "Ergonomic equipment", "Physical therapy"],
  },
  {
    tag: "Brain Hemorrhage",
    keywords: ["headache", "altered sensorium", "weakness of one body side", "vomiting"],
    response: "You may have Paralysis due to Brain Hemorrhage — requires immediate medical attention.",
    precaution: "Manage hypertension. Seek prompt medical attention for stroke symptoms. Follow healthy lifestyle. Control diabetes and cholesterol.",
    riskLevel: "emergency",
    firstAid: ["Call emergency services immediately (112)", "Do not move the person", "Note time symptoms started", "Keep airway clear"],
    precautionItems: ["Manage hypertension", "Seek prompt attention for stroke symptoms", "Healthy lifestyle", "Control diabetes and cholesterol"],
  },
  {
    tag: "Jaundice",
    keywords: ["high fever", "fatigue", "weight loss", "itching", "abdominal pain", "vomiting", "yellowish skin", "dark urine"],
    response: "You may have Jaundice — yellowing of the skin and eyes caused by liver problems or infections.",
    precaution: "Prevent hepatitis through vaccination. Practice good hygiene. Avoid excessive alcohol. Seek prompt medical attention.",
    riskLevel: "high",
    firstAid: ["Get plenty of rest", "Stay hydrated", "Avoid alcohol and fatty foods", "Consult a healthcare professional"],
    precautionItems: ["Prevent hepatitis via vaccination", "Good hygiene", "Avoid excessive alcohol", "Prompt medical attention"],
  },
  {
    tag: "Malaria",
    keywords: ["sweating", "high fever", "muscle pain", "headache", "diarrhea", "vomiting", "chills", "nausea"],
    response: "You may have Malaria — a mosquito-borne disease causing high fever and severe symptoms.",
    precaution: "Use insect repellent and bed nets. Take prescribed antimalarials. Eliminate standing water. Be aware of risk in endemic areas.",
    riskLevel: "high",
    firstAid: ["Take antimalarial medications as prescribed", "Get plenty of rest", "Stay hydrated", "Use mosquito nets and repellents"],
    precautionItems: ["Use insect repellent and bed nets", "Take prescribed antimalarials", "Eliminate standing water", "Awareness of endemic areas"],
  },
  {
    tag: "Chicken Pox",
    keywords: ["red spots", "high fever", "fatigue", "malaise", "loss of appetite", "skin rash", "itching", "mild fever"],
    response: "You may have Chicken Pox — a highly contagious viral infection causing itchy rash and flu-like symptoms.",
    precaution: "Get vaccinated. Avoid close contact with infected individuals. Practice good hygiene. Use OTC treatments for symptom relief.",
    riskLevel: "medium",
    firstAid: ["Get plenty of rest", "Keep affected areas clean, don't scratch", "Take pain relievers for fever", "Isolate to prevent spread"],
    precautionItems: ["Get vaccinated", "Avoid contact with infected individuals", "Good hygiene", "OTC treatments for relief"],
  },
  {
    tag: "Dengue",
    keywords: ["high fever", "fatigue", "muscle pain", "malaise", "loss of appetite", "skin rash", "vomiting", "back pain", "chills", "nausea", "joint pain", "pain behind eyes"],
    response: "You may have Dengue — a mosquito-borne viral infection causing severe flu-like symptoms.",
    precaution: "Prevent mosquito bites. Eliminate mosquito breeding sites. Get prompt medical attention. Follow public health guidelines.",
    riskLevel: "high",
    firstAid: ["Stay hydrated with plenty of fluids", "Get plenty of rest", "Monitor platelet count", "Use mosquito nets and repellents"],
    precautionItems: ["Prevent mosquito bites", "Eliminate mosquito breeding sites", "Prompt medical attention", "Follow public health guidelines"],
  },
  {
    tag: "Typhoid",
    keywords: ["high fever", "fatigue", "diarrhea", "abdominal pain", "vomiting", "chills", "nausea", "constipation"],
    response: "You may have Typhoid — a bacterial infection causing high fever and gastrointestinal symptoms.",
    precaution: "Practice good hygiene. Consume safe, well-cooked food and water. Consider typhoid vaccination. Seek medical treatment.",
    riskLevel: "high",
    firstAid: ["Take antibiotics as prescribed by doctor", "Stay hydrated and eat bland diet", "Wash hands frequently", "Rest and avoid strenuous activities"],
    precautionItems: ["Good hygiene and handwashing", "Safe food and water", "Consider typhoid vaccination", "Seek medical treatment"],
  },
  {
    tag: "Hepatitis A",
    keywords: ["muscle pain", "loss of appetite", "mild fever", "diarrhea", "abdominal pain", "vomiting", "yellowish skin", "nausea", "joint pain", "dark urine"],
    response: "You may have Hepatitis A — a viral infection that affects the liver and can cause jaundice.",
    precaution: "Get vaccinated. Practice good hygiene and food safety. Avoid contaminated water and food.",
    riskLevel: "high",
    firstAid: ["Get plenty of rest", "Stay hydrated and eat balanced diet", "Avoid alcohol and liver-damaging substances", "Consult healthcare professional"],
    precautionItems: ["Get vaccinated", "Good hygiene and food safety", "Avoid contaminated water", "Immune globulin for high-risk"],
  },
  {
    tag: "Hepatitis B",
    keywords: ["fatigue", "malaise", "loss of appetite", "itching", "abdominal pain", "yellowish skin", "yellowing of eyes", "dark urine"],
    response: "You may have Hepatitis B — a viral infection that affects the liver and can lead to chronic liver disease.",
    precaution: "Get vaccinated. Practice safe sex. Avoid sharing needles. Healthcare workers should follow standard precautions.",
    riskLevel: "high",
    firstAid: ["Consult healthcare professional for antiviral treatment", "Get vaccinated to prevent future infections", "Practice safe sex, avoid sharing needles", "Limit alcohol consumption"],
    precautionItems: ["Get vaccinated", "Practice safe sex", "Avoid sharing needles", "Standard precautions"],
  },
  {
    tag: "Hepatitis C",
    keywords: ["fatigue", "jaundice", "abdominal pain", "dark urine"],
    response: "You may have Hepatitis C — a viral infection that affects the liver.",
    precaution: "Avoid sharing needles. Practice safe sex. Follow standard precautions. Consider antiviral medications.",
    riskLevel: "high",
    firstAid: ["Consult healthcare professional", "Antiviral medications can help", "Avoid alcohol", "Follow liver-healthy diet"],
    precautionItems: ["Avoid sharing needles", "Practice safe sex", "Standard precautions", "Consider antiviral medications"],
  },
  {
    tag: "Hepatitis D",
    keywords: ["fatigue", "loss of appetite", "abdominal pain", "vomiting", "yellowish skin", "nausea", "joint pain", "yellowing of eyes", "dark urine"],
    response: "You may have Hepatitis D — a viral infection that worsens symptoms of Hepatitis B.",
    precaution: "Get vaccinated against Hepatitis B. Practice safe sex. Avoid sharing needles. Follow standard precautions.",
    riskLevel: "high",
    firstAid: ["Consult healthcare professional for antiviral treatment", "Get vaccinated for Hepatitis B", "Avoid alcohol and liver-damaging substances", "Follow medical advice and regular check-ups"],
    precautionItems: ["Vaccinate against Hepatitis B", "Safe sex", "Avoid sharing needles", "Standard precautions"],
  },
  {
    tag: "Hepatitis E",
    keywords: ["high fever", "fatigue", "loss of appetite", "abdominal pain", "vomiting", "yellowish skin", "nausea", "joint pain", "yellowing of eyes", "dark urine"],
    response: "You may have Hepatitis E — a viral infection affecting the liver that can cause severe symptoms.",
    precaution: "Good hygiene and safe food handling. Avoid untreated water in endemic areas. Get prompt medical attention.",
    riskLevel: "high",
    firstAid: ["Seek immediate medical attention if severe", "Get plenty of rest and stay hydrated", "Follow medical advice", "Practice good hygiene"],
    precautionItems: ["Good hygiene and food handling", "Avoid untreated water", "Prompt medical attention", "Consider vaccination for travel"],
  },
  {
    tag: "Alcoholic Hepatitis",
    keywords: ["abdominal pain", "yellowish skin", "swelling of stomach", "vomiting", "history of alcohol"],
    response: "You may have Alcoholic Hepatitis — caused by excessive alcohol consumption.",
    precaution: "Limit alcohol or abstain. Seek help for dependence. Eat balanced diet. Monitor liver health.",
    riskLevel: "high",
    firstAid: ["Stop consuming alcohol immediately", "Seek medical attention", "Rest and hydrate", "Follow doctor's advice"],
    precautionItems: ["Limit or abstain from alcohol", "Seek help for dependence", "Balanced diet", "Monitor liver health"],
  },
  {
    tag: "Tuberculosis",
    keywords: ["sweating", "cough", "fatigue", "high fever", "weight loss", "loss of appetite", "chest pain", "breathlessness", "blood in sputum"],
    response: "You may have Tuberculosis — a bacterial infection that affects the lungs.",
    precaution: "Get vaccinated. Take prescribed medications for latent TB. Practice good respiratory hygiene. Follow isolation protocols.",
    riskLevel: "high",
    firstAid: ["Seek immediate medical attention", "Follow treatment plan", "Rest and maintain good hygiene", "Isolate to prevent spread"],
    precautionItems: ["Get vaccinated", "Take prescribed TB medications", "Good respiratory hygiene", "Follow treatment protocols"],
  },
  {
    tag: "Pneumonia",
    keywords: ["sweating", "cough", "fatigue", "high fever", "fast heart rate", "chest pain", "chills", "breathlessness"],
    response: "You may have Pneumonia — a bacterial or viral infection of the lungs.",
    precaution: "Get vaccinated against pneumonia and influenza. Practice good hand hygiene. Avoid smoking. Seek prompt medical attention.",
    riskLevel: "high",
    firstAid: ["Seek immediate medical attention", "Follow prescribed antibiotics", "Get plenty of rest and stay hydrated", "Avoid smoking"],
    precautionItems: ["Get vaccinated", "Good hand hygiene", "Avoid smoking", "Prompt medical attention"],
  },
  {
    tag: "Hemorrhoids",
    keywords: ["pain in anal region", "irritation in anus", "bloody stool", "pain during bowel movements", "constipation"],
    response: "You may have Hemorrhoids (Piles) — affecting the rectal area.",
    precaution: "Maintain regular bowel habits, avoid straining. Use fiber supplements and sitz baths. Stay hydrated. Consider topical treatments.",
    riskLevel: "low",
    firstAid: ["High-fiber diet to avoid constipation", "Keep anal area clean and dry", "Use OTC creams for relief", "Consult doctor for severe cases"],
    precautionItems: ["Regular bowel habits", "Fiber supplements", "Stay hydrated", "Topical treatments"],
  },
  {
    tag: "Hypothyroidism",
    keywords: ["fatigue", "cold hands", "mood swings", "weight gain", "dizziness", "depression", "irritability", "lethargy", "brittle nails"],
    response: "You may have Hypothyroidism — the thyroid gland doesn't produce enough hormones.",
    precaution: "Take thyroid medication as prescribed. Follow up with thyroid function tests. Maintain healthy diet and exercise. Be aware of thyroid disruptors.",
    riskLevel: "medium",
    firstAid: ["Take thyroid medication as prescribed", "Maintain balanced diet", "Exercise regularly", "Get regular check-ups"],
    precautionItems: ["Take prescribed thyroid medications", "Regular thyroid function tests", "Healthy diet and exercise", "Avoid thyroid disruptors"],
  },
  {
    tag: "Hyperthyroidism",
    keywords: ["sweating", "fatigue", "fast heart rate", "restlessness", "weight loss", "mood swings", "diarrhea", "muscle weakness", "irritability", "excessive hunger"],
    response: "You may have Hyperthyroidism — the thyroid produces too much thyroid hormone.",
    precaution: "Take prescribed medications. Regular thyroid function tests. Manage stress. Avoid excessive iodine.",
    riskLevel: "medium",
    firstAid: ["Consult an endocrinologist", "Medication or radioactive iodine may help", "Monitor thyroid levels regularly", "Maintain healthy lifestyle"],
    precautionItems: ["Take prescribed medications", "Regular thyroid tests", "Manage stress", "Avoid excessive iodine"],
  },
  {
    tag: "Hypoglycemia",
    keywords: ["sweating", "fatigue", "headache", "vomiting", "anxiety", "nausea", "blurred vision", "irritability", "palpitations", "excessive hunger"],
    response: "You may have Hypoglycemia — low blood sugar levels.",
    precaution: "Monitor blood sugar levels. Eat regular meals and snacks. Carry glucose for emergencies. Adjust diabetes medications as advised.",
    riskLevel: "medium",
    firstAid: ["Consume fast-acting carbohydrates (glucose tablets/juice)", "Follow balanced diet with regular meals", "Carry medical ID", "Consult healthcare provider"],
    precautionItems: ["Monitor blood sugar", "Regular meals and snacks", "Carry glucose sources", "Adjust diabetes medications as advised"],
  },
  {
    tag: "Acne",
    keywords: ["blackheads", "skin rash", "pimples", "pus filled pimples"],
    response: "You may have Acne — a common skin condition with pimples and inflammation.",
    precaution: "Maintain daily skincare routine. Avoid excessive washing. Manage stress. Consider dermatologist-recommended treatments.",
    riskLevel: "low",
    firstAid: ["Maintain good skincare hygiene", "Use recommended acne treatments", "Avoid picking or squeezing pimples", "Consider diet and lifestyle changes"],
    precautionItems: ["Daily skincare routine", "Avoid excessive washing", "Manage stress", "Consider dermatologist treatments"],
  },
  {
    tag: "Psoriasis",
    keywords: ["skin peeling", "joint pain", "skin pain", "itchy skin", "skin rash", "nail changes"],
    response: "You may have Psoriasis — a chronic skin condition with scaling and inflammation.",
    precaution: "Follow skincare routine. Keep skin moisturized. Manage stress. Adhere to prescribed medications.",
    riskLevel: "medium",
    firstAid: ["Consult a dermatologist", "Topical medications and phototherapy may help", "Moisturize regularly", "Avoid triggers and manage stress"],
    precautionItems: ["Skincare routine", "Keep skin moisturized", "Manage stress", "Follow prescribed treatments"],
  },
  {
    tag: "Impetigo",
    keywords: ["blister", "high fever", "red sore around nose", "skin rash"],
    response: "You may have Impetigo — a highly contagious skin infection.",
    precaution: "Good hand hygiene. Avoid close skin-to-skin contact. Use clean towels. Take prescribed antibiotics.",
    riskLevel: "medium",
    firstAid: ["Consult doctor for antibiotic treatment", "Maintain good hygiene", "Avoid close contact during infection", "Follow prescribed medications"],
    precautionItems: ["Good hand hygiene", "Avoid close skin contact", "Clean towels and clothing", "Take prescribed antibiotics"],
  },
  {
    tag: "Fungal Infection",
    keywords: ["skin patches", "skin eruptions", "skin rash", "itching"],
    response: "You may have a Fungal Infection — can affect the skin causing various symptoms.",
    precaution: "Keep skin clean and dry. Avoid sharing personal items. Use antifungal medications. Wear clean, breathable clothing.",
    riskLevel: "low",
    firstAid: ["Consult a dermatologist", "Keep affected area clean and dry", "Avoid tight clothing that traps moisture", "Practice good personal hygiene"],
    precautionItems: ["Keep skin clean and dry", "Don't share personal items", "Use antifungal medications", "Clean breathable clothing"],
  },
  {
    tag: "Heart Attack",
    keywords: ["sweating", "chest pain", "shortness of breath", "lightheadedness", "vomiting", "heartburn", "cold sweat"],
    response: "You may be experiencing a Heart Attack — a serious medical emergency!",
    precaution: "Maintain heart-healthy diet. Exercise regularly. Manage stress. Quit smoking and limit alcohol.",
    riskLevel: "emergency",
    firstAid: ["Call emergency services immediately (112)", "Chew and swallow aspirin if not allergic", "Stay calm and sit or lie down", "Loosen tight clothing"],
    precautionItems: ["Heart-healthy diet", "Regular exercise", "Manage stress", "Quit smoking"],
  },
  {
    tag: "Varicose Veins",
    keywords: ["fatigue", "bruising", "swollen legs", "swollen blood vessels", "prominent veins", "cramps", "obesity"],
    response: "You might have Varicose Veins — swollen and twisted veins that can be painful.",
    precaution: "Elevate legs regularly. Wear compression stockings. Exercise and maintain healthy weight. Avoid prolonged sitting/standing.",
    riskLevel: "low",
    firstAid: ["Elevate legs when resting", "Wear compression stockings", "Exercise regularly", "Consult doctor for severe symptoms"],
    precautionItems: ["Elevate legs regularly", "Compression stockings", "Exercise and healthy weight", "Avoid prolonged sitting/standing"],
  },
  {
    tag: "Vertigo",
    keywords: ["spinning", "headache", "vomiting", "nausea", "unsteadiness", "loss of balance"],
    response: "You may have Vertigo — characterized by sudden spinning sensations.",
    precaution: "Avoid sudden head movements. Stay hydrated. Manage stress. Consider vestibular rehabilitation therapy.",
    riskLevel: "medium",
    firstAid: ["Consult ENT specialist or neurologist", "Undergo specific positional maneuvers", "Avoid sudden head movements", "Follow prescribed treatment"],
    precautionItems: ["Avoid sudden head movements", "Stay hydrated", "Manage stress", "Vestibular rehabilitation therapy"],
  },
  {
    tag: "Anemia",
    keywords: ["shortness of breath", "fast heartbeat", "fatigue", "cold hands", "dizziness", "headache", "pale skin", "weakness", "brittle nails"],
    response: "You may have Anemia — shortage of red blood cells to carry oxygen.",
    precaution: "Diet rich in iron, folate, vitamin B12. Consider supplements. Treat underlying causes. Regular blood tests.",
    riskLevel: "medium",
    firstAid: ["Determine and treat underlying cause", "Increase iron intake", "Balanced diet rich in vitamins and minerals", "Consult a hematologist"],
    precautionItems: ["Iron, folate, vitamin B12 rich diet", "Consider supplements", "Treat underlying causes", "Regular blood tests"],
  },
  {
    tag: "Eczema",
    keywords: ["itchy skin", "inflamed skin", "redness", "rash"],
    response: "You might have Eczema (Atopic Dermatitis) — itchy and inflamed patches of skin.",
    precaution: "Keep skin moisturized. Avoid irritants. Use hypoallergenic products. Manage stress.",
    riskLevel: "low",
    firstAid: ["Consult a dermatologist", "Moisturize regularly", "Avoid triggers", "Topical corticosteroids may help"],
    precautionItems: ["Keep skin moisturized", "Avoid irritants", "Hypoallergenic products", "Manage stress"],
  },
  {
    tag: "Lupus",
    keywords: ["joint pain", "skin rash", "fatigue", "fever", "stiffness", "swelling"],
    response: "You may have Lupus (SLE) — an autoimmune disease affecting various body parts.",
    precaution: "Manage stress and get rest. Use sunscreen. Take prescribed medications. Regular check-ups with rheumatologist.",
    riskLevel: "high",
    firstAid: ["Consult healthcare professional", "Medications to control inflammation", "Avoid sun exposure", "Rest and manage stress"],
    precautionItems: ["Manage stress and rest", "Use sunscreen", "Take prescribed medications", "Regular rheumatology check-ups"],
  },
  {
    tag: "Celiac Disease",
    keywords: ["digestive discomfort", "diarrhea", "weight loss", "skin rash"],
    response: "You might have Celiac Disease — an autoimmune disorder triggered by gluten consumption.",
    precaution: "Maintain gluten-free diet. Read food labels. Regular check-ups with gastroenterologist. Seek dietitian support.",
    riskLevel: "medium",
    firstAid: ["Consult healthcare professional", "Adopt a gluten-free diet", "Read food labels carefully", "Get regular check-ups"],
    precautionItems: ["Gluten-free diet", "Read food labels", "Regular gastroenterologist visits", "Dietitian support"],
  },
  {
    tag: "Fibromyalgia",
    keywords: ["widespread pain", "fatigue", "sleep disturbances", "cognitive difficulties"],
    response: "You may have Fibromyalgia — a chronic pain condition affecting muscles and soft tissues.",
    precaution: "Manage stress and get adequate sleep. Exercise regularly. Consider physical therapy. Seek healthcare support.",
    riskLevel: "medium",
    firstAid: ["Consult healthcare professional", "Medications and physical therapy help", "Lifestyle adjustments", "Pacing and gradual activity increase"],
    precautionItems: ["Manage stress and sleep", "Exercise regularly", "Physical therapy", "Healthcare provider support"],
  },
  {
    tag: "Atrial Fibrillation",
    keywords: ["irregular heartbeat", "dizziness", "fatigue", "palpitations"],
    response: "You may have Atrial Fibrillation (AFib) — an irregular heart rhythm.",
    precaution: "Heart-healthy lifestyle. Manage blood pressure and cholesterol. Follow prescribed medications. Avoid excessive alcohol and caffeine.",
    riskLevel: "high",
    firstAid: ["Consult a cardiologist", "Medications may be prescribed", "Reduce stroke risk", "Monitor heart rhythm"],
    precautionItems: ["Heart-healthy lifestyle", "Manage blood pressure", "Follow prescribed medications", "Avoid excess alcohol/caffeine"],
  },
  {
    tag: "Pancreatitis",
    keywords: ["severe abdominal pain", "nausea", "vomiting", "fever", "rapid heart rate"],
    response: "You may have Pancreatitis — inflammation of the pancreas.",
    precaution: "Limit alcohol or abstain. Low-fat diet. Manage underlying causes. Follow treatment plans.",
    riskLevel: "high",
    firstAid: ["Consult healthcare professional", "May require hospitalization", "Fasting and pain management", "Avoid alcohol"],
    precautionItems: ["Limit alcohol", "Low-fat diet", "Manage underlying causes", "Follow treatment plans"],
  },
  {
    tag: "Chronic Kidney Disease",
    keywords: ["fatigue", "swelling in legs", "swelling in ankles", "changes in urine"],
    response: "You might have Chronic Kidney Disease (CKD) — affecting kidney function progressively.",
    precaution: "Manage underlying health conditions. Balanced diet and healthy weight. Stay hydrated. Regular nephrologist check-ups.",
    riskLevel: "high",
    firstAid: ["Consult healthcare professional", "Medications and lifestyle changes help", "Monitor kidney function", "Follow prescribed diet"],
    precautionItems: ["Manage underlying conditions", "Balanced diet", "Stay hydrated", "Regular nephrologist visits"],
  },
  {
    tag: "IBS",
    keywords: ["abdominal pain", "bloating", "diarrhea", "constipation"],
    response: "You might have Irritable Bowel Syndrome (IBS) — a common gastrointestinal disorder.",
    precaution: "Identify and avoid trigger foods. High-fiber diet. Manage stress. Regular eating schedule.",
    riskLevel: "low",
    firstAid: ["Consult gastroenterologist", "Dietary changes and medications can help", "Manage stress levels", "Keep food diary to identify triggers"],
    precautionItems: ["Avoid trigger foods", "High-fiber diet", "Manage stress", "Regular eating schedule"],
  },
  {
    tag: "Multiple Sclerosis",
    keywords: ["fatigue", "muscle weakness", "numbness", "difficulty walking", "vision problems"],
    response: "You may have Multiple Sclerosis (MS) — a neurological disease affecting the central nervous system.",
    precaution: "Balanced diet and regular exercise. Manage stress. Follow prescribed medications. Regular neurologist check-ups.",
    riskLevel: "high",
    firstAid: ["Consult a neurologist", "Medications and physical therapy help", "Manage stress levels", "Follow prescribed treatment plan"],
    precautionItems: ["Balanced diet and exercise", "Manage stress", "Follow prescribed medications", "Regular neurologist visits"],
  },
  {
    tag: "Influenza",
    keywords: ["fever", "body aches", "headache", "fatigue", "cough", "sore throat", "chills"],
    response: "You may have Influenza (Flu) — a viral infection with sudden onset of fever, body aches, and respiratory symptoms.",
    precaution: "Get annual flu vaccination. Wash hands frequently. Avoid close contact with sick individuals. Stay home when sick.",
    riskLevel: "medium",
    firstAid: ["Rest completely", "Stay hydrated with warm fluids", "Take antiviral medication if within 48 hours", "Monitor temperature regularly"],
    precautionItems: ["Annual flu vaccination", "Wash hands frequently", "Avoid contact with sick individuals", "Stay home when sick"],
  },
  {
    tag: "Gastroenteritis",
    keywords: ["diarrhea", "dehydration", "vomiting", "nausea", "stomach pain"],
    response: "You may have Gastroenteritis — inflammation of the stomach and intestines.",
    precaution: "Good hygiene and handwashing. Avoid contaminated food/water. Stay hydrated. Follow public health guidelines.",
    riskLevel: "low",
    firstAid: ["Stay hydrated with ORS solution", "Eat bland foods (BRAT diet)", "Avoid dairy and fatty foods", "Seek help if symptoms persist >48 hours"],
    precautionItems: ["Good hygiene", "Avoid contaminated food/water", "Stay hydrated", "Follow public health guidelines"],
  },
  {
    tag: "Meningitis",
    keywords: ["fever", "neck stiffness", "headache", "sensitivity to light", "confusion"],
    response: "You may have Meningitis — a serious infection causing inflammation of brain and spinal cord membranes.",
    precaution: "Get vaccinated. Practice good hygiene. Avoid close contact with infected individuals. Seek immediate medical care.",
    riskLevel: "emergency",
    firstAid: ["Seek emergency medical help immediately (112)", "Do not wait for symptoms to worsen", "Keep patient comfortable and still", "Note onset time of symptoms for doctors"],
    precautionItems: ["Get vaccinated", "Good hygiene", "Avoid contact with infected", "Seek immediate care"],
  },
  {
    tag: "Ovarian Cyst",
    keywords: ["pelvic pain", "bloating", "irregular menstruation"],
    response: "You might have an Ovarian Cyst — a fluid-filled sac on or within the ovaries.",
    precaution: "Maintain healthy diet and weight. Use birth control to prevent cyst formation. Manage stress. Monitor with doctor.",
    riskLevel: "medium",
    firstAid: ["Consult healthcare professional", "Treatment depends on size and symptoms", "May involve observation, medication, or surgery", "Regular monitoring"],
    precautionItems: ["Healthy diet and weight", "Birth control methods", "Manage stress", "Monitor with doctor"],
  },
];

// Normalize symptom text for matching
function normalizeSymptom(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// Tokenize user input into individual symptom-like fragments
function tokenizeSymptoms(input: string): string[] {
  return input.toLowerCase()
    .split(/[,;.]+/)
    .map(s => s.trim())
    .filter(s => s.length > 1);
}

/**
 * Match user symptoms against the intent knowledge base.
 * Returns scored diagnoses sorted by confidence.
 */
export function matchSymptoms(userSymptoms: string[]): {
  predictions: { disease: string; confidence: number; description: string; firstAid: string[]; precautions: string[] }[];
  riskLevel: string;
} {
  const normalizedInput = userSymptoms.map(normalizeSymptom);

  const scores: { intent: IntentEntry; score: number; matchedCount: number }[] = [];

  for (const intent of INTENTS) {
    let matchedCount = 0;
    for (const keyword of intent.keywords) {
      const normKw = normalizeSymptom(keyword);
      // Check if any user symptom contains this keyword or vice versa
      if (normalizedInput.some(s => s.includes(normKw) || normKw.includes(s))) {
        matchedCount++;
      }
    }

    if (matchedCount === 0) continue;

    // Score: ratio of matched keywords weighted by how many user symptoms matched
    const keywordCoverage = matchedCount / intent.keywords.length;
    const inputCoverage = matchedCount / normalizedInput.length;
    const score = keywordCoverage * 0.6 + inputCoverage * 0.4;

    if (score > 0.2) {
      scores.push({ intent, score, matchedCount });
    }
  }

  // Sort by score descending, take top 3
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 3);

  if (top.length === 0) {
    return {
      predictions: [{
        disease: "General Assessment Needed",
        confidence: 0.3,
        description: "Your symptoms don't match a specific pattern in our database. Please consult a healthcare provider for proper diagnosis.",
        firstAid: ["Rest and stay hydrated", "Monitor symptoms for changes", "Consult a doctor if symptoms persist or worsen"],
        precautions: [],
      }],
      riskLevel: normalizedInput.some(s =>
        ["chest pain", "shortness of breath", "neck stiffness", "sudden chest pain", "weakness of one body side"].some(e => s.includes(e))
      ) ? "high" : "low",
    };
  }

  const riskLevels = ["low", "medium", "high", "emergency"];
  const maxRisk = top.reduce((max, t) => {
    const rIdx = riskLevels.indexOf(t.intent.riskLevel);
    return rIdx > riskLevels.indexOf(max) ? t.intent.riskLevel : max;
  }, "low");

  return {
    predictions: top.map(t => ({
      disease: t.intent.tag,
      confidence: Math.round(Math.min(t.score * 1.2, 0.95) * 100) / 100,
      description: t.intent.response,
      firstAid: t.intent.firstAid,
      precautions: t.intent.precautionItems,
    })),
    riskLevel: maxRisk,
  };
}

// --- Conversational chatbot logic ---

interface ChatSession {
  stage: "greeting" | "collecting" | "diagnosed";
  name?: string;
  age?: string;
  gender?: string;
  symptoms: string[];
  lastDiagnosis?: ReturnType<typeof matchSymptoms>;
}

const sessions = new Map<number, ChatSession>();

function getSession(userId: number): ChatSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, { stage: "greeting", symptoms: [] });
  }
  return sessions.get(userId)!;
}

/**
 * Process a chatbot message from the user.
 * Returns a response with optional structured data.
 */
export function processChatMessage(userId: number, message: string): { text: string; data?: ChatResponseData } {
  const session = getSession(userId);
  const msg = message.trim().toLowerCase();

  // Greeting detection
  if (session.stage === "greeting" && /^(hi|hey|hello|good morning|good evening|good afternoon)/.test(msg)) {
    session.stage = "collecting";
    return {
      text: "Hello! I'm MediSafe's AI Symptom Checker. Tell me about your symptoms and I'll help assess potential conditions. You can describe them in natural language or list them separated by commas.",
      data: { type: "greeting" },
    };
  }

  // Goodbye
  if (/^(bye|goodbye|see you|thanks|thank you|quit)/.test(msg)) {
    sessions.delete(userId);
    return {
      text: "Take care! Remember, for any serious symptoms, please consult a healthcare professional. Stay healthy! 💊",
      data: { type: "info" },
    };
  }

  // Meta questions
  if (/who are you|what (are|do) you|what can you do/.test(msg)) {
    return {
      text: "I'm MediSafe's AI Symptom Checker! Describe your symptoms and I'll analyze them against 60+ medical conditions to provide potential diagnoses, risk levels, and first-aid recommendations.",
      data: { type: "info" },
    };
  }

  // Reset / new analysis
  if (/^(reset|start over|new|clear)/.test(msg)) {
    session.symptoms = [];
    session.lastDiagnosis = undefined;
    session.stage = "collecting";
    return {
      text: "Session reset. Tell me your new symptoms and I'll analyze them.",
      data: { type: "info" },
    };
  }

  // Precaution request (after diagnosis)
  if (session.lastDiagnosis && /precaution|prevent|avoid|how to prevent/.test(msg)) {
    const top = session.lastDiagnosis.predictions[0];
    if (top && top.precautions.length > 0) {
      return {
        text: `**Precautions for ${top.disease}:**\n${top.precautions.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
        data: { type: "precaution", tag: top.disease, precautions: top.precautions },
      };
    }
  }

  // More details on first aid (after diagnosis)
  if (session.lastDiagnosis && /first aid|what (should|can) i do|treatment|remedy/.test(msg)) {
    const top = session.lastDiagnosis.predictions[0];
    if (top && top.firstAid.length > 0) {
      return {
        text: `**First Aid for ${top.disease}:**\n${top.firstAid.map((f, i) => `${i + 1}. ${f}`).join("\n")}`,
        data: { type: "diagnosis", tag: top.disease, firstAid: top.firstAid },
      };
    }
  }

  // Extract symptoms from message, set stage, and analyze
  session.stage = "collecting";
  const extracted = tokenizeSymptoms(message);
  if (extracted.length > 0) {
    session.symptoms = [...new Set([...session.symptoms, ...extracted])];
  } else {
    // Try treating the whole message as a symptom phrase
    session.symptoms = [...new Set([...session.symptoms, msg])];
  }

  // Perform analysis
  const result = matchSymptoms(session.symptoms);
  session.lastDiagnosis = result;
  session.stage = "diagnosed";

  const riskEmoji = result.riskLevel === "emergency" ? "🚨" : result.riskLevel === "high" ? "⚠️" : result.riskLevel === "medium" ? "🔶" : "✅";

  let response = `${riskEmoji} **Risk Level: ${result.riskLevel.toUpperCase()}**\n\n`;
  response += `Based on your symptoms (${session.symptoms.join(", ")}), here are the possible conditions:\n\n`;

  result.predictions.forEach((p, i) => {
    response += `**${i + 1}. ${p.disease}** (${Math.round(p.confidence * 100)}% match)\n`;
    response += `${p.description}\n\n`;
  });

  response += `\nYou can ask me for **precautions**, **first aid** details, or describe **additional symptoms** for a more accurate assessment.`;

  return {
    text: response,
    data: {
      type: "diagnosis",
      disease: result.predictions[0]?.disease,
      confidence: result.predictions[0]?.confidence,
      riskLevel: result.riskLevel,
      firstAid: result.predictions[0]?.firstAid,
      precautions: result.predictions[0]?.precautions,
    },
  };
}

/** Get expanded symptom list covering all conditions in our knowledge base */
export const EXPANDED_SYMPTOM_LIST = [
  // Original list
  "fever", "cough", "headache", "fatigue", "nausea", "vomiting",
  "diarrhea", "sore throat", "runny nose", "body aches", "chills",
  "shortness of breath", "chest pain", "dizziness", "abdominal pain",
  "joint pain", "muscle pain", "rash", "itching", "swelling",
  "loss of appetite", "weight loss", "night sweats", "frequent urination",
  "burning urination", "blood in urine", "constipation", "bloating",
  "heartburn", "back pain", "neck stiffness", "blurred vision",
  "ear pain", "difficulty swallowing", "sneezing", "watery eyes",
  "skin redness", "bruising", "numbness", "tingling",
  // New from chatbot knowledge base
  "wheezing", "breathlessness", "chest tightness", "palpitations",
  "sweating", "high fever", "mild fever", "cold hands",
  "mood swings", "weight gain", "depression", "irritability",
  "lethargy", "restlessness", "excessive hunger", "excessive thirst",
  "muscle weakness", "loss of balance", "weakness in limbs",
  "painful walking", "hip joint pain", "knee pain", "stiffness",
  "skin rash", "skin peeling", "itchy skin", "pale skin",
  "yellowish skin", "yellowing of eyes", "dark urine",
  "irregular heartbeat", "fast heartbeat",
  "sensitivity to light", "vision problems", "spinning",
  "sleep disturbances", "widespread pain", "cognitive difficulties",
  "persistent sadness", "loss of interest", "anxiety",
  "difficulty walking", "swollen legs",
  "pelvic pain", "irregular menstruation",
  "bloody stool", "indigestion",
] as const;
