import streamlit as st
from pathlib import Path
import joblib

MODEL_PATH = Path(__file__).resolve().parent / "model.joblib"
CHART_MODEL_PATH = Path(__file__).resolve().parent / "charts" / "model_comparison.png"
CHART_SURFACE_PATH = Path(__file__).resolve().parent / "charts" / "favorite_win_rate.png"

PLAYER_DATA = [
    {"name": "Jannik Sinner", "rank": 1, "points": 13450, "age": 23, "height": 190},
    {"name": "Carlos Alcaraz", "rank": 2, "points": 8160, "age": 22, "height": 188},
    {"name": "Alexander Zverev", "rank": 3, "points": 8120, "age": 27, "height": 198},
    {"name": "Félix Auger-Aliassime", "rank": 4, "points": 4740, "age": 24, "height": 193},
    {"name": "Novak Djokovic", "rank": 5, "points": 3760, "age": 38, "height": 188},
    {"name": "Daniil Medvedev", "rank": 6, "points": 3620, "age": 29, "height": 198},
    {"name": "Alex de Minaur", "rank": 7, "points": 3560, "age": 25, "height": 183},
    {"name": "Taylor Fritz", "rank": 8, "points": 3400, "age": 27, "height": 193},
    {"name": "Flavio Cobolli", "rank": 9, "points": 3330, "age": 22, "height": 185},
    {"name": "Ben Shelton", "rank": 10, "points": 2680, "age": 22, "height": 196},
    {"name": "Alexandre Bublik", "rank": 11, "points": 2535, "age": 27, "height": 190},
    {"name": "Jakub Menšík", "rank": 12, "points": 2380, "age": 23, "height": 188},
    {"name": "Lorenzo Musetti", "rank": 13, "points": 2375, "age": 22, "height": 186},
    {"name": "Casper Ruud", "rank": 14, "points": 2345, "age": 26, "height": 183},
    {"name": "Rubén Jódar", "rank": 15, "points": 2243, "age": 21, "height": 183},
]

PLAYER_LOOKUP = {player["name"]: player for player in PLAYER_DATA}
PLAYER_NAMES = [player["name"] for player in PLAYER_DATA]


@st.cache_resource
def load_model():
    """Load the trained neural-network model once and cache it for efficiency."""
    if not MODEL_PATH.exists():
        st.error(
            f"Model file not found at: {MODEL_PATH}\n\n"
            "Train it with the project script or save your trained model here before running the app."
        )
        st.stop()
    return joblib.load(MODEL_PATH)


def compute_features(player_a, player_b):
    """Build the 4-feature vector expected by the trained model."""
    return [
        player_a["rank"] - player_b["rank"],
        player_a["points"] - player_b["points"],
        player_a["age"] - player_b["age"],
        player_a["height"] - player_b["height"],
    ]


def probability_for_player_a(model, player_a, player_b):
    """Return the probability that the selected Player A wins."""
    features = compute_features(player_a, player_b)
    probs = model.predict_proba([features])[0]
    class_labels = list(model.classes_)

    if 1 in class_labels:
        a_win_index = class_labels.index(1)
    elif True in class_labels:
        a_win_index = class_labels.index(True)
    else:
        a_win_index = 1 if len(probs) > 1 else 0

    return float(probs[a_win_index])


st.set_page_config(page_title="CourtVision Match Predictor", page_icon="🎾", layout="wide")

if "show_report" not in st.session_state:
    st.session_state.show_report = False

st.markdown(
    """
    <style>
    .block-container {
        padding-top: 2rem;
    }
    .main > div {
        background: linear-gradient(180deg, #f6f7f0 0%, #edf4ef 100%);
    }
    .stApp {
        color: #18392b;
    }
    .headline {
        font-size: 3rem;
        font-weight: 800;
        letter-spacing: -0.04em;
        color: #143d2f;
        margin: 0;
    }
    .subhead {
        font-size: 1.1rem;
        color: #3b574d;
        margin-top: 0.5rem;
        margin-bottom: 1.25rem;
    }
    .card {
        background: rgba(255,255,255,0.72);
        border: 1px solid rgba(20,61,47,0.12);
        border-radius: 18px;
        padding: 1.25rem;
        box-shadow: 0 8px 24px rgba(26, 66, 56, 0.08);
    }
    .article-shell {
        max-width: 760px;
        margin: 0 auto;
        font-size: 1.04rem;
        line-height: 1.75;
    }
    .article-kicker {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.72rem;
        color: #466a60;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }
    .article-quote {
        border-left: 4px solid #1a6b4d;
        padding-left: 1rem;
        color: #234b3a;
        font-style: italic;
        margin: 1.4rem 0;
        background: rgba(255,255,255,0.3);
        border-radius: 0 12px 12px 0;
    }
    .stSidebar .stButton > button {
        width: 100%;
        background: linear-gradient(135deg, #143d2f 0%, #216a4c 100%);
        color: #ffffff;
        border: none;
        border-radius: 12px;
        padding: 0.8rem 1rem;
        font-size: 1rem;
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(20, 61, 47, 0.22);
    }
    .stSidebar .stButton > button:hover {
        background: linear-gradient(135deg, #0f3127 0%, #19553c 100%);
        box-shadow: 0 12px 26px rgba(20, 61, 47, 0.28);
    }
    div[data-testid="stVerticalBlock"] > div:has(> .stButton) {
        margin-top: 0.5rem;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

with st.sidebar:
    st.markdown("### Matchup Lab")
    if st.button("Read the full research report", use_container_width=True, type="primary"):
        st.session_state.show_report = True

st.markdown("<p class='headline'>CourtVision Predictor</p>", unsafe_allow_html=True)
st.markdown(
    "<p class='subhead'>A tennis matchup forecast built around current ATP rankings, points, age, and height.</p>",
    unsafe_allow_html=True,
)

if st.session_state.show_report:
    st.markdown("---")
    st.markdown("<div class='article-shell'>", unsafe_allow_html=True)
    st.markdown("<div class='article-kicker'>Research Report</div>", unsafe_allow_html=True)
    st.header("Why the rankings dominate the model")

    st.markdown(
        """
        This project set out to answer a practical question: can historical ATP data tell us who is likely to win a match before the first serve is hit? The answer is yes, but only to a limited extent. The models can estimate a probability, yet they do not dramatically outperform the simplest and most familiar baseline: picking the higher-ranked player.

        The reason is not a flaw in the machine-learning approach. It is a feature of tennis itself. ATP rankings already encode a large part of the match-relevant signal. Better-ranked players usually have stronger recent results, more elite-level experience, and more stable overall form. Because of that, the ranking gap becomes the strongest input by a wide margin.
        """
    )

    st.image(CHART_MODEL_PATH, caption="Model accuracy compared with the favorite-wins baseline.", use_container_width=True)

    st.markdown(
        """
        Across the experiments, the neural network, logistic regression, and other models all stayed within a narrow band of performance. The difference between the baseline and the more sophisticated models was small enough that it suggests the data itself has a ceiling. Once the ranking information is in place, the remaining variation is driven by upsets, form swings, and unpredictability that static pre-match features do not fully capture.

        In other words, rankings are not just one predictor among many. They are the dominant signal. Ranking points mirror the same story, and age or height offer only modest additional nuance. The model can detect who is favored, but it struggles to consistently beat the favorite rule because the sport contains enough volatility that the hidden factors matter a lot.
        """
    )

    st.markdown(
        "<div class='article-quote'>The real limit is not the model—it is the information available before the match begins.</div>",
        unsafe_allow_html=True,
    )

    st.image(CHART_SURFACE_PATH, caption="Favorite win rate by surface shows how rankings remain stable across match conditions.", use_container_width=True)

    st.markdown(
        """
        Looking at the surface breakdown makes the same point even more clearly: the favorite usually wins, and the relative ranking advantage is far more influential than any of the other basic features in the dataset. The models do not fail because of poor engineering; they fail because tennis is inherently volatile and many of the most important variables are not visible in the dataset.

        A future version of this project would likely benefit from richer features like recent form, head-to-head history, court-specific performance, injury status, and travel or schedule fatigue. Those are the kinds of variables that can separate the favorite from the upset, and they are exactly the kinds of signals that the current four-feature setup cannot capture.

        The strongest takeaway is therefore simple: in ATP match prediction, rank is the story. Everything else matters, but only after the ranking signal is accounted for. The result is a forecasting system that is useful and interpretable, but still bounded by the reality that tennis often rewards the unexpected.
        """
    )

    metric_cols = st.columns(3)
    metric_cols[0].metric("Best lift vs baseline", "+0.5 pts")
    metric_cols[1].metric("Dominant feature", "Ranking gap")
    metric_cols[2].metric("Main takeaway", "Volatility remains high")

    if st.button("Back to match predictor", use_container_width=True):
        st.session_state.show_report = False
    st.markdown("</div>", unsafe_allow_html=True)
    st.stop()

left_col, right_col = st.columns([1.5, 1])

with left_col:
    st.markdown("<div class='card'>", unsafe_allow_html=True)
    st.subheader("Choose the matchup")

    player_a_name = st.selectbox(
        "Player A",
        PLAYER_NAMES,
        index=0,
        help="Select the first player in the matchup.",
    )

    available_player_b = [name for name in PLAYER_NAMES if name != player_a_name]
    player_b_name = st.selectbox(
        "Player B",
        available_player_b,
        index=0,
        help="The second player cannot be the same as Player A.",
    )

    player_a = PLAYER_LOOKUP[player_a_name]
    player_b = PLAYER_LOOKUP[player_b_name]

    st.caption("Current ATP snapshot")
    stat_cols = st.columns(4)
    for col, key in zip(stat_cols, ["rank", "points", "age", "height"]):
        label = key.title() if key != "points" else "Points"
        if key == "points":
            value = f"{player_a[key]:,}"
        else:
            value = str(player_a[key])
        col.metric(label, value)

    model = load_model()

    if st.button("Predict winner", use_container_width=True):
        prob_a = probability_for_player_a(model, player_a, player_b)
        prob_b = 1 - prob_a
        projected_winner = player_a_name if prob_a >= 0.5 else player_b_name
        confidence = max(prob_a, prob_b) * 100

        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.subheader("Prediction")
        st.markdown(
            f"<div style='font-size: 2.4rem; font-weight: 800; color: #143d2f;'>"
            f"{projected_winner} wins"
            f"</div>",
            unsafe_allow_html=True,
        )
        st.markdown(
            f"<div style='font-size: 3.2rem; font-weight: 800; color: #1d6f4d;'>"
            f"{confidence:.1f}% confidence"
            f"</div>",
            unsafe_allow_html=True,
        )
        st.progress(prob_a if prob_a >= 0.5 else prob_b)
        st.write(
            f"{player_a_name}: {prob_a * 100:.1f}% | {player_b_name}: {prob_b * 100:.1f}%"
        )
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("</div>", unsafe_allow_html=True)

with right_col:
    st.markdown("<div class='card'>", unsafe_allow_html=True)
    st.subheader("Match profile")
    st.write(f"**Player A:** {player_a_name}")
    st.write(f"**Rank:** #{player_a['rank']} | **Points:** {player_a['points']:,} | **Age:** {player_a['age']} | **Height:** {player_a['height']} cm")
    st.write(f"**Player B:** {player_b_name}")
    st.write(f"**Rank:** #{player_b['rank']} | **Points:** {player_b['points']:,} | **Age:** {player_b['age']} | **Height:** {player_b['height']} cm")

    feature_list = compute_features(player_a, player_b)
    st.write("**Model inputs:**")
    st.write(
        "- Rank difference: "
        f"{feature_list[0]}"
        "\n- Points difference: "
        f"{feature_list[1]}"
        "\n- Age difference: "
        f"{feature_list[2]}"
        "\n- Height difference: "
        f"{feature_list[3]}"
    )
    st.markdown("</div>", unsafe_allow_html=True)

st.caption("Author: Roman Belchikov")
