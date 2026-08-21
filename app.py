"""CourtVision — Streamlit entry point.

The interface itself is a self-contained web app built from `web/` (React +
TypeScript, with the trained network exported to JSON and run in the browser).
This module is only the shell: it reads the built single-file bundle and hands
it to Streamlit full-bleed, so `streamlit run app.py` and Streamlit Community
Cloud both serve the real UI.

Rebuild the bundle after changing anything under `web/`:

    cd web && npm install && npm run build
"""

from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).resolve().parent
BUNDLE = ROOT / "web" / "dist" / "index.html"

st.set_page_config(
    page_title="CourtVision — ATP Match Predictor",
    page_icon="🎾",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Strip Streamlit's chrome so the app owns the whole viewport. The selectors are
# deliberately redundant: Streamlit renames these test ids between versions.
st.markdown(
    """
    <style>
      header[data-testid="stHeader"],
      div[data-testid="stToolbar"],
      div[data-testid="stDecoration"],
      section[data-testid="stSidebar"],
      #MainMenu,
      footer { display: none !important; }

      .stApp, body { background: #060e0c !important; }

      .block-container,
      div[data-testid="stMainBlockContainer"],
      section[data-testid="stMain"] > div {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
      }

      div[data-testid="stVerticalBlock"] { gap: 0 !important; }

      /* The embedded app scrolls internally, so give it the whole window.
         The iframe title has changed across Streamlit versions ("st.iframe" as
         of 1.4x+, "streamlit.components.v1.html" before that), so match on the
         container too rather than relying on either name. */
      iframe[title="st.iframe"],
      iframe[title="streamlit.components.v1.html"],
      div[data-testid="stIFrame"] iframe,
      section[data-testid="stMain"] iframe,
      .stApp iframe {
        height: 100vh !important;
        width: 100% !important;
        border: none !important;
        display: block !important;
      }

      div[data-testid="stIFrame"],
      div[data-testid="element-container"]:has(iframe) {
        height: 100vh !important;
        overflow: hidden !important;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

if not BUNDLE.exists():
    st.error("The interface hasn't been built yet.")
    st.markdown(
        f"""
        `{BUNDLE.relative_to(ROOT)}` is missing. Build it once and this page will serve it:

        ```bash
        cd web
        npm install
        npm run build
        ```

        For UI development, `npm run dev` in `web/` gives you hot reload on
        <http://localhost:5173> without going through Streamlit.
        """
    )
    st.stop()

components.html(BUNDLE.read_text(encoding="utf-8"), height=1000, scrolling=True)
