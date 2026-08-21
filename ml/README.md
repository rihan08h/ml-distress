# ML Pipeline — Smart Medicine Platform

This directory contains machine learning models and training pipelines.

## Models

| Model | Purpose | Algorithm | Status |
|-------|---------|-----------|--------|
| Symptom Classifier | Multi-label symptom → disease | XGBoost | MVP (rule-based) |
| Demand Predictor | Pharmacy stock forecasting | Prophet + XGBoost | Scaffold |
| NER Extractor | Prescription text parsing | spaCy custom NER | Scaffold |
| Drug Interaction | Severity prediction | Gradient Boosting | Scaffold |

## Directory Structure

```
ml/
├── config/          # Training configs
├── data/            # Training datasets (gitignored)
├── models/          # Saved model artifacts
├── notebooks/       # Jupyter exploration
├── training/        # Training scripts
└── evaluation/      # Evaluation & metrics
```

## Quick Start

```bash
cd ml
pip install -r requirements.txt
python training/train_symptom_classifier.py
```
