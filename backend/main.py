import io
import json
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from typing import Any, List, Dict
import google.generativeai as genai

import os
import hashlib
from dotenv import load_dotenv

# Initialize in-memory caches
query_cache = {}
insights_cache = {}

# Load environment variables from .env file (located in parent directory, or wherever it is)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Initialize FastAPI app
app = FastAPI(title="Nexus BI Backend")

# Add CORS middleware to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database Engine
try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300
    )
    # Simple check to see if we can connect
    with engine.connect() as connection:
        pass
except Exception as e:
    print(f"Warning: Could not connect to the database. Error: {e}")

# Configure Gemini AI
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-3.1-flash-lite-preview')

# --- Models ---
class Message(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class QueryRequest(BaseModel):
    query: str
    table_name: str
    history: list[Message] = []

class InsightsRequest(BaseModel):
    data: Any
    context_query: str = ""

class PreviewRequest(BaseModel):
    table_name: str

# --- Database Initialization ---
def init_db():
    try:
        with engine.begin() as connection:
            # Create metadata table if it doesn't exist
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS _nexus_metadata (
                    table_name TEXT PRIMARY KEY,
                    summary TEXT,
                    suggested_questions JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            # Create analyses table if it doesn't exist
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS _nexus_analyses (
                    id SERIAL PRIMARY KEY,
                    table_name TEXT,
                    question TEXT,
                    sql TEXT,
                    chart_type TEXT,
                    summary TEXT,
                    data JSONB,
                    insights JSONB,
                    messages JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            print("Database initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")

init_db()

def get_cached_analysis(table_name: str, question: str):
    """Retrieves a previously saved analysis for the same question and table."""
    try:
        with engine.connect() as connection:
            query = text("""
                SELECT sql, chart_type, summary, data, insights, messages 
                FROM _nexus_analyses 
                WHERE table_name = :t AND LOWER(question) = LOWER(:q)
                ORDER BY created_at DESC LIMIT 1
            """)
            result = connection.execute(query, {"t": table_name, "q": question.strip()}).fetchone()
            if result:
                return {
                    "generated_sql": result[0],
                    "chart_type": result[1],
                    "summary": result[2],
                    "data": result[3],
                    "insights": result[4],
                    "messages": result[5],
                    "cached": True
                }
    except Exception as e:
        print(f"Error fetching cached analysis: {e}")
    return None

def save_analysis(table_name: str, question: str, sql: str, chart_type: str, summary: str, data: Any, insights: Any, messages: List[Dict]):
    """Saves an analysis result to the database."""
    try:
        if not table_name or not question:
            print(f"Warning: Attempted to save analysis with missing data. table={table_name}, question={question}")
            return False

        with engine.begin() as connection:
            query = text("""
                INSERT INTO _nexus_analyses (table_name, question, sql, chart_type, summary, data, insights, messages)
                VALUES (:t, :q, :s, :ct, :sm, :d, :i, :m)
            """)
            connection.execute(query, {
                "t": table_name,
                "q": question,
                "s": sql,
                "ct": chart_type,
                "sm": summary,
                "d": json.dumps(data) if not isinstance(data, (str, bytes)) else data,
                "i": json.dumps(insights) if not isinstance(insights, (str, bytes)) else insights,
                "m": json.dumps(messages) if not isinstance(messages, (str, bytes)) else messages
            })
            print(f"Successfully saved analysis for table '{table_name}' and question '{question[0:50]}...'")
            return True
    except Exception as e:
        print(f"CRITICAL: Error saving analysis to database: {e}")
        import traceback
        traceback.print_exc()
        return False

def get_persisted_metadata(table_name: str):
    """Retrieves saved metadata for a table if it exists."""
    try:
        with engine.connect() as connection:
            query = text("SELECT summary, suggested_questions FROM _nexus_metadata WHERE table_name = :t")
            result = connection.execute(query, {"t": table_name}).fetchone()
            if result:
                return {
                    "summary": result[0],
                    "suggested_questions": result[1]
                }
    except Exception as e:
        print(f"Error fetching metadata for {table_name}: {e}")
    return None

def save_metadata(table_name: str, summary: str, suggested_questions: List[str]):
    """Saves or updates metadata for a table."""
    try:
        with engine.begin() as connection:
            query = text("""
                INSERT INTO _nexus_metadata (table_name, summary, suggested_questions)
                VALUES (:t, :s, :q)
                ON CONFLICT (table_name) DO UPDATE 
                SET summary = EXCLUDED.summary, suggested_questions = EXCLUDED.suggested_questions
            """)
            connection.execute(query, {
                "t": table_name,
                "s": summary,
                "q": json.dumps(suggested_questions) if not isinstance(suggested_questions, (str, bytes)) else suggested_questions
            })
            print(f"Successfully saved metadata for table '{table_name}'")
            return True
    except Exception as e:
        print(f"Error saving metadata for {table_name}: {e}")
        return False

async def generate_and_save_preview(table_name: str):
    """Internal helper to generate preview info via Gemini and persist it."""
    try:
        # 1. Fetch sample data
        with engine.connect() as connection:
            sample_query = text(f"SELECT * FROM {table_name} LIMIT 5;")
            result = connection.execute(sample_query)
            sample_rows = result.fetchall()
            keys = result.keys()
            sample_data = [dict(zip(keys, row)) for row in sample_rows]
            
            # Fetch schema
            schema_query = text(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{table_name}';
            """)
            schema_res = connection.execute(schema_query).fetchall()
            schema_str = ", ".join([f"{row[0]} ({row[1]})" for row in schema_res])

        if not sample_data:
            return None

        # 2. Gemini generation
        prompt = f"""
        Table: '{table_name}'
        Columns: {schema_str}
        Sample Data: {json.dumps(sample_data, default=str)}
        
        Acting as a data analyst, provide two things in JSON format:
        1. "summary": A concise, 1-line professional summary of what this dataset appears to be about.
        2. "suggested_questions": A list of exactly 3 relevant, interesting business questions a user might want to ask this data.
        
        Respond ONLY with a valid JSON object. No backticks, no markdown.
        """
        response = model.generate_content(prompt)
        ai_insights = json.loads(response.text.strip().replace("```json", "").replace("```", ""))
        
        # 3. Save to DB
        save_metadata(
            table_name, 
            ai_insights.get("summary", ""), 
            ai_insights.get("suggested_questions", [])
        )
        
        return {
            "sample_data": sample_data,
            "summary": ai_insights.get("summary", ""),
            "suggested_questions": ai_insights.get("suggested_questions", [])
        }
    except Exception as e:
        print(f"Generation failed: {e}")
        return None

# --- Endpoints ---

@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...), table_name: str = Form(...)):
    """
    Accepts a CSV file, parses it via Pandas, and dynamically creates a table in PostgreSQL.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only .csv files are allowed.")
    
    try:
        contents = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(contents), encoding='latin-1')
        
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.replace(r'[^\w\s]', '', regex=True)
        df.to_sql(table_name, engine, if_exists='replace', index=False)
        
        # PROACTIVE: Generate and save metadata right after upload
        await generate_and_save_preview(table_name)
        
        return {
            "message": f"Successfully uploaded and inserted data into table '{table_name}'.",
            "rows": len(df),
            "columns": list(df.columns)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/query")
async def process_query(req: QueryRequest):
    """
    Takes natural language, uses Gemini to convert to SQL, executes against DB, and returns data + recommended chart type.
    Includes caching to avoid Gemini calls for repeated questions.
    """
    try:
        # 0. Check database for previous analysis of this exact question
        cached = get_cached_analysis(req.table_name, req.query)
        if cached:
            return cached

        # 1. Fetch table schema to provide context to Gemini
        with engine.connect() as connection:
            schema_query = text(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{req.table_name}';
            """)
            schema_result = connection.execute(schema_query).fetchall()
            
        if not schema_result:
            raise HTTPException(status_code=404, detail=f"Table '{req.table_name}' not found.")
            
        schema_str = ", ".join([f"{row[0]} ({row[1]})" for row in schema_result])
        
        # 2. Fetch a few sample rows to help Gemini understand the data formats (especially dates)
        with engine.connect() as connection:
            sample_query = text(f"SELECT * FROM {req.table_name} LIMIT 3;")
            sample_rows = connection.execute(sample_query).fetchall()
            sample_data_str = json.dumps([dict(row._mapping) for row in sample_rows], default=str)

        # 3. Format history for context
        history_str = ""
        if req.history:
            history_str = "Previous conversation history:\n"
            for msg in req.history:
                role_name = "User" if msg.role == "user" else "Assistant"
                history_str += f"{role_name}: {msg.content}\n"
            history_str += "\n"

        # 4. Ask Gemini to generate SQL and a chart type
        prompt = f"""
        {history_str}
        Table: '{req.table_name}'
        Columns: {schema_str}
        Sample Data (Check for date formats like DD-MM-YYYY vs YYYY-MM-DD): {sample_data_str}
        
        User question: "{req.query}"
        
        Respond ONLY with a valid JSON object containing exactly three keys: 
        1. "sql": The raw PostgreSQL query. 
           - Match your `TO_DATE` format to the sample data provided above.
           - If the sample shows '12-03-2023', use 'DD-MM-YYYY'.
           - If it shows '2023-03-12', use 'YYYY-MM-DD'.
           - Use standard SQL syntax (no markdown block/formatting).
           - If comparing multiple categories (e.g., 'Compare Sales of A and B'), PIVOT the data so each category has its own column. 
           - Example goal for comparison: `[{{"month": "Jan", "Electronics": 100, "Fashion": 150}}, ...]`
        2. "chart_type": A recommended chart type (choose one: 'bar', 'line', 'pie', 'table', 'scatter', 'area').
           - Use 'line' or 'bar' for comparisons over time.
           - Use 'pie' only for single-category distributions.
        3. "summary": A very brief (1-sentence) friendly natural language summary of what this data shows (e.g., "Here is the comparison of revenue trends between Electronics and Fashion for 2023.").
        
        Important Data Type Instructions:
        - If you need to filter, group, or extract time from a column that contains dates but is stored as `text` or `varchar` (like DD-MM-YYYY), use `TO_DATE(column_name, 'DD-MM-YYYY')` or `TO_DATE(column_name, 'YYYY-MM-DD')` to prevent Postgres out of range errors.
        - Ensure columns used for Y-axis in charts are numeric.
 
        RULE: Bar Chart SQL Structure
        When the user asks to compare categories using a bar chart, DO NOT use "CASE WHEN" to pivot categories into separate columns. 
        Instead, use a standard "GROUP BY" query. 
        The resulting SQL must return exactly two columns: one containing the Category Name (String), and one containing the Value (Number).
        
        Important: Output only the raw JSON. No backticks, no markdown.
        """
        # 4. Check cache first
        cache_key = hashlib.md5(f"{req.table_name}:{req.query}:{history_str}".encode()).hexdigest()
        if cache_key in query_cache:
            result_json = query_cache[cache_key]
            sql_query = result_json.get("sql")
            chart_type = result_json.get("chart_type", "table")
        else:
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Small cleanup in case Gemini returns markdown JSON blocks anyway
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
                
            result_json = json.loads(response_text.strip())
            sql_query = result_json.get("sql")
            chart_type = result_json.get("chart_type", "table")
            
            # Save to cache
            query_cache[cache_key] = result_json
            
        # 5. Execute the generated SQL query
        with engine.connect() as connection:
            db_result = connection.execute(text(sql_query))
            # Convert result rows into a list of dictionaries
            keys = db_result.keys()
            data = [dict(zip(keys, row)) for row in db_result.fetchall()]
            
        return {
            "data": data,
            "chart_type": chart_type,
            "summary": result_json.get("summary", ""),
            "generated_sql": sql_query
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/insights")
async def generate_insights(req: InsightsRequest):
    """
    Takes queried data and uses Gemini to return structured 'Pros/Cons' and 'Predictions' insights.
    """
    if not req.data:
        return {"pros_cons": "No data available to analyze.", "predictions": "No data available to forecast."}
        
    try:
        sample_data = req.data[:50] if isinstance(req.data, list) else req.data
        data_str = json.dumps(sample_data, sort_keys=True)
        cache_key = hashlib.md5(f"{req.context_query}:{data_str}".encode()).hexdigest()
        if cache_key in insights_cache:
            return insights_cache[cache_key]
        
        prompt = f"""
        Analyze the following data subset (up to 50 rows) and provide business insights.
        Context/Question the user asked: '{req.context_query}'
        Data: {json.dumps(sample_data)}
        
        Respond ONLY with a valid JSON object containing exactly two keys. Both keys MUST have plain string values (DO NOT use nested objects or arrays):
        1. "pros_cons": A single string containing a short paragraph or markdown bullet points explaining the positive aspects (Pros) and negative aspects/risks (Cons).
        2. "predictions": A single string containing a brief forecast or recommendation based on the trends.
        
        Important: Output only the raw JSON. No backticks, no markdown.
        """
        
        response = model.generate_content(prompt)
        response_text = response.text.strip().replace("```json", "").replace("```", "")
        insights = json.loads(response_text.strip())
        insights_cache[cache_key] = insights
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

@app.get("/api/databases")
async def get_databases():
    """
    Fetches a list of all dynamically created tables (databases) from PostgreSQL.
    """
    try:
        with engine.connect() as connection:
            query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name NOT LIKE '\_%'
            """)
            result = connection.execute(query).fetchall()
            tables = [row[0] for row in result]
        return {"databases": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch databases: {str(e)}")

@app.get("/api/analyses")
async def get_all_analyses():
    """Fetches a list of all saved analyses for the sidebar/cards."""
    try:
        with engine.connect() as connection:
            query = text("""
                SELECT id, table_name, question, created_at 
                FROM _nexus_analyses 
                ORDER BY created_at DESC
            """)
            result = connection.execute(query).fetchall()
            analyses = [
                {
                    "id": row[0],
                    "table_name": row[1],
                    "question": row[2],
                    "created_at": row[3].isoformat() if row[3] else None
                } for row in result
            ]
        return {"analyses": analyses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analyses/{analysis_id}")
async def get_analysis_detail(analysis_id: int):
    """Fetches full details of a specific past analysis."""
    try:
        with engine.connect() as connection:
            query = text("""
                SELECT id, table_name, question, sql, chart_type, summary, data, insights, messages, created_at
                FROM _nexus_analyses 
                WHERE id = :id
            """)
            row = connection.execute(query, {"id": analysis_id}).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Analysis not found")
                
            return {
                "id": row[0],
                "table_name": row[1],
                "question": row[2],
                "generated_sql": row[3],
                "chart_type": row[4],
                "summary": row[5],
                "data": row[6],
                "insights": row[7],
                "messages": row[8],
                "created_at": row[9].isoformat() if row[9] else None
            }
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyses")
async def post_analysis(req: Dict[str, Any]):
    """Saves an analysis to the database (auto-save)."""
    success = save_analysis(
        table_name=req.get("table_name", ""),
        question=req.get("question", ""),
        sql=req.get("sql", ""),
        chart_type=req.get("chart_type", ""),
        summary=req.get("summary", ""),
        data=req.get("data", []),
        insights=req.get("insights", {}),
        messages=req.get("messages", [])
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save analysis to database. Check server logs.")
    return {"status": "success"}

@app.get("/api/preview/{table_name}")
async def get_data_preview(table_name: str):
    """
    Fetches a sample of 5 rows and generates (or retrieves cached) summary/questions.
    """
    try:
        # 1. Try to get persisted metadata
        metadata = get_persisted_metadata(table_name)
        
        # Always fetch fresh sample data (5 rows)
        with engine.connect() as connection:
            sample_query = text(f"SELECT * FROM {table_name} LIMIT 5;")
            result = connection.execute(sample_query)
            sample_rows = result.fetchall()
            keys = result.keys()
            sample_data = [dict(zip(keys, row)) for row in sample_rows]

        if not sample_data:
            return {"sample_data": [], "summary": "No data found.", "suggested_questions": []}

        if metadata:
            return {
                "sample_data": sample_data,
                "summary": metadata["summary"],
                "suggested_questions": metadata["suggested_questions"]
            }

        # 2. If not found, generate and save it
        insights = await generate_and_save_preview(table_name)
        if insights:
            return insights
            
        # Fallback
        return {
            "sample_data": sample_data,
            "summary": "Data preview generated.",
            "suggested_questions": ["Show total count", "Show first 10 rows", "What are the columns?"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# For local testing/running
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
