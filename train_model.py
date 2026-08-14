from pathlib import Path

import joblib
import pandas as pd
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

DATA_PATH = Path(__file__).resolve().parent / "data" / "atp_2000_2024_model_ready.csv"
MODEL_PATH = Path(__file__).resolve().parent / "model.joblib"
FEATURES = ["rank_diff", "points_diff", "age_diff", "height_diff"]


def main() -> None:
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURES].copy()
    y = df["target"].astype(int)

    model = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "mlp",
                MLPClassifier(
                    hidden_layer_sizes=(32, 16),
                    activation="relu",
                    solver="adam",
                    max_iter=400,
                    random_state=42,
                    early_stopping=True,
                    n_iter_no_change=20,
                ),
            ),
        ]
    )

    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)

    print(f"Saved model to: {MODEL_PATH}")
    print(f"Training accuracy: {model.score(X, y):.4f}")


if __name__ == "__main__":
    main()
