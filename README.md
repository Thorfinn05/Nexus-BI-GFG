# Nexus-BI-GFG

# 🚀 NEXUS-BI-GFG
### Conversational AI for Instant Business Intelligence Dashboards

**NEXUS-BI-GFG** is an AI-powered Business Intelligence platform that enables **non-technical users to generate interactive dashboards using simple natural language queries.**

Instead of writing complex SQL queries or navigating BI tools, users can simply ask questions like:

> *"Show the monthly sales revenue for Q3 broken down by region and highlight the top-performing product category."*

The system automatically:

- Understands the natural language query  
- Generates the correct **SQL query**  
- Retrieves data from the database  
- Selects the **most appropriate chart type**  
- Creates a **fully interactive dashboard in real time**

---

# 📌 Problem Statement

In many organizations, business insights are locked behind technical tools like SQL databases or complex BI platforms. This creates a dependency on data teams for even simple reporting tasks.

**NEXUS-BI-GFG eliminates this barrier by allowing executives and business users to explore data conversationally.**

Users can ask questions in plain English and instantly receive **visual dashboards and insights.**

---

# ✨ Key Features

## 💬 Natural Language Querying
Ask business questions in simple English.

Example:

> Show total revenue by region for the last quarter.

---

## 🧠 AI-Powered SQL Generation
The system uses **LLM-powered prompt engineering** to convert natural language queries into accurate SQL queries automatically.

---

## 📊 Intelligent Chart Selection
Charts are selected automatically based on the type of data.

| Data Type | Visualization |
|----------|---------------|
| Time-series data | Line Chart |
| Category comparison | Bar Chart |
| Parts of a whole | Pie Chart |
| Distribution | Histogram |
| Relationship between variables | Scatter Plot |

---

## 📈 Interactive Dashboard Generation
Generated dashboards include:

- Dynamic charts  
- Hover tooltips  
- Interactive visualizations  
- Clean and modern layout

---

## 💡 AI Business Insights
Along with charts, the system generates **short analytical insights** that help users quickly understand key trends.

Example insight:

> *"The West region contributes 38% of total revenue and shows the highest growth trend."*

---

## 🔁 Conversational Dashboard
Users can refine dashboards with follow-up questions.

Example:

> “Now filter this dashboard to only show Electronics.”

---

## ⚠️ Smart Error Handling
If the system cannot answer a query due to missing data or ambiguity, it **asks for clarification instead of generating incorrect results.**

---


---

# 🛠 Tech Stack

## Frontend
- ⚛️ React
- 📊 Chart.js / Recharts / Plotly (for visualization)
- 🎨 Tailwind / CSS (UI styling)

## Backend
- ⚡ FastAPI
- 🐍 Python
- 📦 Pandas (data processing)

## Database
- 🟢 NeonDB (Serverless PostgreSQL)

## AI Integration
- 🤖 Google Gemini API

---


---

# ⚙️ Installation

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/Supercoder2005/NEXUS-BI-GFG.git 

## Backend setup
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt 

## Run FastAPI server
uvicorn main:app --reload

## Frontend setup
npm install
npm run dev