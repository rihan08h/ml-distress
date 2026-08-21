"""Symptom Classifier — XGBoost-based multi-label classifier.

Training script for the symptom-to-disease prediction model.
Uses pre-processed symptom dataset from ml/data/.
"""

import os
import yaml
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from xgboost import XGBClassifier


def load_config():
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'training_config.yaml')
    with open(config_path) as f:
        return yaml.safe_load(f)['symptom_classifier']


def generate_mock_data(n_samples=1000, n_symptoms=50, n_diseases=10):
    """Generate synthetic training data for MVP demonstration."""
    np.random.seed(42)
    X = np.random.randint(0, 2, size=(n_samples, n_symptoms))
    y = np.random.randint(0, n_diseases, size=n_samples)
    return X, y


def train():
    config = load_config()
    print(f"Training Symptom Classifier with config: {config['model_type']}")

    # Load or generate data
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'symptom_disease.csv')
    if os.path.exists(data_path):
        df = pd.read_csv(data_path)
        # Expect columns: symptom_1, symptom_2, ..., disease_label
        feature_cols = [c for c in df.columns if c.startswith('symptom_')]
        X = df[feature_cols].values
        y = df['disease_label'].values
    else:
        print("No training data found. Using synthetic data for MVP.")
        X, y = generate_mock_data()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=config.get('train_test_split', 0.2),
        random_state=config.get('random_state', 42),
    )

    model = XGBClassifier(
        n_estimators=config['hyperparams']['n_estimators'],
        max_depth=config['hyperparams']['max_depth'],
        learning_rate=config['hyperparams']['learning_rate'],
        subsample=config['hyperparams'].get('subsample', 0.8),
        colsample_bytree=config['hyperparams'].get('colsample_bytree', 0.8),
        use_label_encoder=False,
        eval_metric='mlogloss',
    )

    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=True)

    # Evaluate
    y_pred = model.predict(X_test)
    print("\n=== Classification Report ===")
    print(classification_report(y_test, y_pred))

    # Save model
    model_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, 'symptom_classifier.joblib')
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")


if __name__ == '__main__':
    train()
