"""
AI flow:

User question
    -> Gemini generates read-only DuckDB SQL
    -> DuckDB executes against the real DataFrame
    -> Real result
    -> Gemini explains the result

Important:
The LLM does not calculate the final data result itself.
"""

import json
import os
import re
import time
from pathlib import Path

import duckdb
import pandas as pd
from dotenv import load_dotenv
from fastapi import HTTPException
from google import genai

# =========================================================
# CONFIG
# =========================================================

# Load backend/.env. override=True makes .env win over stale
# Windows environment variables. Must run BEFORE os.getenv below.
load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash")

MAX_ROWS = 1000

# Newer Gemini models may spend part of the output budget on thinking,
# so we multiply the requested budget to leave room for the visible answer.
TOKEN_MULTIPLIER = 2


# =========================================================
# SQL SECURITY
# =========================================================

_BLOCKED = re.compile(
    r"\b("
    r"insert|update|delete|drop|alter|create|"
    r"attach|detach|copy|pragma|install|load|"
    r"export|call|set|"
    r"read_csv|read_parquet|read_json|glob"
    r")\b",
    re.I,
)


def is_safe_select(sql: str) -> bool:
    """Allow only one read-only SELECT/WITH query."""
    s = sql.strip().rstrip(";").strip()
    return (
        bool(re.match(r"^(select|with)\b", s, re.I))
        and ";" not in s
        and not _BLOCKED.search(s)
    )


# =========================================================
# DUCKDB EXECUTION
# =========================================================

def run_sql(df: pd.DataFrame, sql: str) -> pd.DataFrame:
    """Execute safe SQL against the provided DataFrame."""
    if not is_safe_select(sql):
        raise HTTPException(
            status_code=400,
            detail="Only single read-only SELECT queries are allowed",
        )

    con = duckdb.connect()
    try:
        con.register("dataset", df)

        # Disable external file/network access in DuckDB.
        con.execute("SET enable_external_access=false")

        clean_sql = sql.strip().rstrip(";")
        limited_sql = f"SELECT * FROM ({clean_sql}) LIMIT {MAX_ROWS}"
        return con.execute(limited_sql).df()

    except duckdb.Error as e:
        raise HTTPException(status_code=400, detail=f"SQL error: {str(e)}")
    finally:
        con.close()


# =========================================================
# GEMINI CLIENT
# =========================================================

def _get_client():
    """Create Gemini client only when needed."""
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not set. Add it to backend/.env and restart uvicorn.",
        )
    return genai.Client(api_key=GEMINI_API_KEY)


# =========================================================
# TEXT EXTRACTION (FIX)
# =========================================================

def _extract_text(interaction) -> str:
    """
    Collect ALL text parts from the response.

    interaction.output_text only returns the trailing block, so if the
    answer is split by a non-text step (e.g. thinking) the beginning is lost.
    """
    parts = []
    for step in getattr(interaction, "steps", None) or []:
        if getattr(step, "type", None) != "model_output":
            continue
        for item in getattr(step, "content", None) or []:
            text = getattr(item, "text", None)
            if getattr(item, "type", None) == "text" and isinstance(text, str):
                parts.append(text)

    return "".join(parts).strip() or (getattr(interaction, "output_text", "") or "").strip()


# =========================================================
# GENERIC LLM FUNCTION (retry + fallback model)
# =========================================================

# (model, seconds to wait before trying)
_ATTEMPTS = [(MODEL, 0), (MODEL, 2), (FALLBACK_MODEL, 4)]


def _is_transient(e: Exception) -> bool:
    """Temporary Google-side errors worth retrying."""
    s = str(e).lower()
    return any(
        k in s
        for k in ("503", "429", "500", "unavailable", "high demand", "overloaded", "rate limit")
    )


def _call_model(client, model: str, system: str, user: str, max_tokens: int):
    """One Gemini call. Falls back to no thinking setting if the model rejects it."""
    config = {
        "max_output_tokens": max_tokens * TOKEN_MULTIPLIER,
        "temperature": 0.2,
        "thinking_level": "low",  # faster; enough for SQL + summaries
    }
    try:
        return client.interactions.create(
            model=model, system_instruction=system, input=user, generation_config=config
        )
    except Exception as e:
        if "thinking" in str(e).lower():
            config.pop("thinking_level")
            return client.interactions.create(
                model=model, system_instruction=system, input=user, generation_config=config
            )
        raise


def _llm(system: str, user: str, max_tokens: int = 800) -> str:
    """Send one request to Gemini; retry on temporary errors, then use fallback model."""
    client = _get_client()
    last_error = None

    for model, wait in _ATTEMPTS:
        if wait:
            time.sleep(wait)
        try:
            interaction = _call_model(client, model, system, user, max_tokens)

            # Debug: uncomment to see how Gemini splits the response.
            # print([getattr(s, "type", None) for s in (interaction.steps or [])], flush=True)

            text = _extract_text(interaction)
            if not text:
                raise HTTPException(status_code=502, detail="Gemini returned an empty response.")
            return text

        except HTTPException:
            raise
        except Exception as e:
            last_error = e
            if not _is_transient(e):
                raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")

    raise HTTPException(
        status_code=503,
        detail=f"Gemini is busy right now. Please try again in a minute. ({last_error})",
    )


# =========================================================
# DATAFRAME SCHEMA
# =========================================================

def _schema(df: pd.DataFrame) -> str:
    """Compact schema: column name, dtype, up to 3 example values."""
    lines = []
    for column in df.columns:
        examples = df[column].dropna().head(3).tolist()
        lines.append(f'- "{column}" ({df[column].dtype}), examples: {examples}')
    return "\n".join(lines)


# =========================================================
# CLEAN GEMINI SQL OUTPUT
# =========================================================

def _clean_sql_output(text: str) -> str:
    """Remove Markdown SQL fences if Gemini returns them."""
    sql = text.strip()
    sql = re.sub(r"^```(?:sql)?\s*", "", sql, flags=re.I)
    sql = re.sub(r"\s*```$", "", sql)
    return sql.strip()


# =========================================================
# NATURAL LANGUAGE -> SQL
# =========================================================

def question_to_sql(question: str, df: pd.DataFrame) -> str:
    """Convert a natural-language question into one safe DuckDB SELECT."""

    system_prompt = """
You are a DuckDB SQL generator.

Rules:

1. The table name is exactly: dataset
2. Return ONLY one SQL query.
3. The query must be read-only.
4. Use only SELECT or WITH.
5. Never use:
   INSERT
   UPDATE
   DELETE
   DROP
   ALTER
   CREATE
   COPY
   ATTACH
   DETACH
   PRAGMA
   INSTALL
   LOAD
   CALL
   SET
   external file functions
6. Quote dataset column names with double quotes.
7. Do not use markdown code fences.
8. Do not explain the SQL.
9. Use only columns listed in the provided schema.
10. Produce DuckDB-compatible SQL.
"""

    user_prompt = f"""
Dataset schema:

{_schema(df)}

User question:

{question}
"""

    raw_sql = _llm(system=system_prompt, user=user_prompt, max_tokens=500)
    sql = _clean_sql_output(raw_sql)

    if not is_safe_select(sql):
        raise HTTPException(
            status_code=400,
            detail="Gemini generated SQL that failed the backend safety check.",
        )
    return sql


# =========================================================
# AI CHAT
# =========================================================

def answer_question(df: pd.DataFrame, question: str) -> dict:
    """
    1. Gemini converts question -> SQL
    2. DuckDB calculates the actual result
    3. Gemini explains the verified result
    """
    if not question or not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    sql = question_to_sql(question=question.strip(), df=df)
    result = run_sql(df=df, sql=sql)

    # Send only a small preview to Gemini
    preview = result.head(20).to_dict(orient="records")

    answer = _llm(
        system="""
You are a professional data analyst.

Explain the verified DuckDB query result
to a non-technical user.

Rules:

- Use ONLY the provided result.
- Do not invent numbers.
- Do not recalculate values.
- Do not claim facts not present in the result.
- Be concise and clear.
- Answer in 1 to 3 sentences.
""",
        user=f"""
Original question:

{question}

Executed SQL:

{sql}

Verified result:

{json.dumps(preview, default=str)}
""",
        max_tokens=300,
    )

    return {
        "answer": answer,
        "sql": sql,
        "rows": preview,
        "row_count": int(len(result)),
    }


# =========================================================
# AI INSIGHTS
# =========================================================

def summarize_dataset(profile: dict, stats: dict, missing: dict) -> str:
    """
    Generate AI insights from data already calculated by backend services.
    Gemini explains the supplied results; it does not do the calculations.
    """

    missing_columns = missing.get("columns", []) if isinstance(missing, dict) else []
    if not isinstance(missing_columns, list):
        missing_columns = []

    clean_profile = {k: v for k, v in profile.items() if k != "memory_usage"}

    payload = {
        "profile": clean_profile,
        "statistics": stats,
        "missing_values": missing_columns[:10],
    }

    # Prevent unnecessarily huge prompts
    payload_text = json.dumps(payload, default=str, ensure_ascii=False)[:12000]

    return _llm(
        system="""
You are a professional data analyst.

The backend has already calculated the dataset results.

Your job is only to explain the supplied VERIFIED facts.

Create at most 6 concise bullet-point insights.

Discuss useful findings such as:

- dataset size
- missing-data issues
- duplicate/data-quality concerns if supplied
- important numeric distributions
- unusually high or low values
- notable patterns
- useful analytical observations

Rules:

- Use ONLY the supplied information.
- Never invent numbers.
- Never invent correlations.
- Never claim a trend unless the supplied data supports it.
- Do not pretend you analyzed raw rows.
- Keep the language understandable to a non-technical user.
""",
        user=payload_text,
        max_tokens=800,
    )