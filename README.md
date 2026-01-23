# Reviso

Smart exam preparation platform powered by AI.

![CI/CD](https://github.com/ShreyasSam2004/Reviso.ai/actions/workflows/ci.yml/badge.svg)

## Features

- **Document Summaries** - AI-powered document analysis and summarization
- **Flashcards** - Generate interactive study flashcards from your documents
- **Mock Tests** - Create MCQ and True/False tests with AI-generated questions
- **Practice Mode** - Fill-in-the-blank and matching exercises
- **Key Terms** - Auto-generated glossary from your study materials
- **Scheduling** - Plan your study sessions with recurring schedules
- **Reports** - Track your progress with detailed analytics
- **Favorites** - Save important items for quick access

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Async ORM with SQLite
- **OpenAI** - AI-powered content generation
- **Pydantic** - Data validation

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Recharts** - Data visualization

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- OpenAI API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ShreyasSam2004/Reviso.ai.git
   cd Reviso.ai
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your OpenAI API key
   uvicorn app.main:app --reload
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Docker Deployment

1. **Configure environment**
   ```bash
   export OPENAI_API_KEY=your-api-key
   export SECRET_KEY=your-secret-key
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the app**
   - App: http://localhost
   - API: http://localhost:8000

## Project Structure

```
Reviso.ai/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, security
│   │   ├── db/           # Database models
│   │   ├── models/       # Pydantic schemas
│   │   └── services/     # Business logic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client
│   │   └── types/        # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .github/workflows/    # CI/CD
```

## Environment Variables

### Backend (.env)
```env
APP_NAME=Reviso
OPENAI_API_KEY=sk-your-key-here
SECRET_KEY=your-jwt-secret
DATABASE_URL=sqlite+aiosqlite:///./data/reviso.db
```

## License

MIT License - see LICENSE file for details.

## Author

Created by Shreyas Sam
