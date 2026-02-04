import axios from 'axios';
import type {
  User,
  AuthToken,
  LoginCredentials,
  RegisterCredentials,
  Document,
  DocumentChunk,
  Summary,
  SummaryRequest,
  QuestionAnswer,
  DocumentStatus,
  FlashcardDeck,
  FlashcardDeckWithCards,
  Flashcard,
  FlashcardGenerateRequest,
  FlashcardGenerateResponse,
  MockTest,
  MockTestWithQuestions,
  TestAttempt,
  MockTestGenerateRequest,
  MockTestGenerateResponse,
  TestSubmitRequest,
  TestResultResponse,
  ScheduledTest,
  ScheduleCreateRequest,
  ScheduleUpdateRequest,
  UpcomingTest,
  PerformanceResponse,
  CategoryBreakdownResponse,
  OverallStats,
  SuggestionsResponse,
  AnalyticsSummary,
  Glossary,
  GlossaryWithTerms,
  GlossaryGenerateRequest,
  GlossaryGenerateResponse,
  PracticeSession,
  PracticeSessionSummary,
  GenerateFillInBlankRequest,
  GenerateMatchingRequest,
  GeneratePracticeResponse,
  PracticeSubmission,
  PracticeResult,
  Favorite,
  AddFavoriteRequest,
  FavoriteCheckResponse,
  SearchResponse,
  MindMap,
  MindMapGenerateRequest,
  MindMapGenerateResponse,
} from '../types';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't clear token for login/register endpoints
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register') && !url.includes('/auth/me')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Authentication
export const login = async (credentials: LoginCredentials): Promise<AuthToken> => {
  const response = await api.post<AuthToken>('/auth/login', credentials);
  return response.data;
};

export const register = async (credentials: RegisterCredentials): Promise<AuthToken> => {
  const response = await api.post<AuthToken>('/auth/register', credentials);
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<User>('/auth/me');
  return response.data;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore errors on logout
  }
};

// Documents
export const uploadDocument = async (file: File): Promise<Document> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<Document>('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const listDocuments = async (): Promise<Document[]> => {
  const response = await api.get<Document[]>('/documents/');
  return response.data;
};

export const getDocument = async (id: string): Promise<Document> => {
  const response = await api.get<Document>(`/documents/${id}`);
  return response.data;
};

export const getDocumentStatus = async (id: string): Promise<DocumentStatus> => {
  const response = await api.get<DocumentStatus>(`/documents/${id}/status`);
  return response.data;
};

export const getDocumentChunks = async (id: string): Promise<DocumentChunk[]> => {
  const response = await api.get<DocumentChunk[]>(`/documents/${id}/chunks`);
  return response.data;
};

export const getDocumentText = async (id: string): Promise<{ text: string; total_chunks: number; total_tokens: number }> => {
  const response = await api.get(`/documents/${id}/text`);
  return response.data;
};

export const deleteDocument = async (id: string): Promise<void> => {
  await api.delete(`/documents/${id}`);
};

// Summaries
export const generateSummary = async (request: SummaryRequest): Promise<Summary> => {
  const response = await api.post<Summary>('/summaries/generate', request);
  return response.data;
};

export const getSummary = async (id: string): Promise<Summary> => {
  const response = await api.get<Summary>(`/summaries/${id}`);
  return response.data;
};

export const getDocumentSummaries = async (documentId: string): Promise<Summary[]> => {
  const response = await api.get<Summary[]>(`/summaries/document/${documentId}`);
  return response.data;
};

export const submitFeedback = async (
  summaryId: string,
  rating: number,
  feedback?: string
): Promise<void> => {
  await api.post(`/summaries/${summaryId}/feedback`, null, {
    params: { rating, feedback },
  });
};

export const askQuestion = async (
  documentId: string,
  question: string
): Promise<QuestionAnswer> => {
  const response = await api.post<QuestionAnswer>('/summaries/ask', null, {
    params: { document_id: documentId, question },
  });
  return response.data;
};

// Flashcards
export const generateFlashcards = async (
  request: FlashcardGenerateRequest
): Promise<FlashcardGenerateResponse> => {
  const response = await api.post<FlashcardGenerateResponse>('/flashcards/generate', request);
  return response.data;
};

export const getDocumentDecks = async (documentId: string): Promise<FlashcardDeck[]> => {
  const response = await api.get<FlashcardDeck[]>(`/flashcards/document/${documentId}`);
  return response.data;
};

export const getDocumentFlashcards = async (documentId: string): Promise<Flashcard[]> => {
  const response = await api.get<Flashcard[]>(`/flashcards/document/${documentId}/cards`);
  return response.data;
};

export const getDeckWithCards = async (deckId: string): Promise<FlashcardDeckWithCards> => {
  const response = await api.get<FlashcardDeckWithCards>(`/flashcards/deck/${deckId}`);
  return response.data;
};

export const exportDeckPdf = async (deckId: string): Promise<Blob> => {
  const response = await api.get(`/flashcards/deck/${deckId}/export/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

export const exportDeckImages = async (deckId: string): Promise<Blob> => {
  const response = await api.get(`/flashcards/deck/${deckId}/export/images`, {
    responseType: 'blob',
  });
  return response.data;
};

export const updateFlashcard = async (
  flashcardId: string,
  updates: { question?: string; answer?: string; difficulty?: string; category?: string }
): Promise<Flashcard> => {
  const response = await api.put<Flashcard>(`/flashcards/${flashcardId}`, updates);
  return response.data;
};

export const deleteFlashcard = async (flashcardId: string): Promise<void> => {
  await api.delete(`/flashcards/${flashcardId}`);
};

export const deleteDeck = async (deckId: string): Promise<void> => {
  await api.delete(`/flashcards/deck/${deckId}`);
};

// Mock Tests
export const generateMockTest = async (
  request: MockTestGenerateRequest
): Promise<MockTestGenerateResponse> => {
  const response = await api.post<MockTestGenerateResponse>('/tests/generate', request);
  return response.data;
};

export const listMockTests = async (): Promise<MockTest[]> => {
  const response = await api.get<MockTest[]>('/tests/');
  return response.data;
};

export const getDocumentTests = async (documentId: string): Promise<MockTest[]> => {
  const response = await api.get<MockTest[]>(`/tests/document/${documentId}`);
  return response.data;
};

export const getMockTestWithQuestions = async (testId: string): Promise<MockTestWithQuestions> => {
  const response = await api.get<MockTestWithQuestions>(`/tests/${testId}`);
  return response.data;
};

export const submitMockTest = async (
  testId: string,
  request: TestSubmitRequest
): Promise<TestResultResponse> => {
  const response = await api.post<TestResultResponse>(`/tests/${testId}/submit`, request);
  return response.data;
};

export const getTestAttempts = async (testId: string): Promise<TestAttempt[]> => {
  const response = await api.get<TestAttempt[]>(`/tests/${testId}/attempts`);
  return response.data;
};

export const getAllAttempts = async (): Promise<TestAttempt[]> => {
  const response = await api.get<TestAttempt[]>('/tests/attempts/all');
  return response.data;
};

export const deleteMockTest = async (testId: string): Promise<void> => {
  await api.delete(`/tests/${testId}`);
};

// Schedules
export const createSchedule = async (
  request: ScheduleCreateRequest
): Promise<ScheduledTest> => {
  const response = await api.post<ScheduledTest>('/schedules/', request);
  return response.data;
};

export const listSchedules = async (): Promise<ScheduledTest[]> => {
  const response = await api.get<ScheduledTest[]>('/schedules/');
  return response.data;
};

export const getSchedule = async (scheduleId: string): Promise<ScheduledTest> => {
  const response = await api.get<ScheduledTest>(`/schedules/${scheduleId}`);
  return response.data;
};

export const getUpcomingTests = async (days: number = 7): Promise<UpcomingTest[]> => {
  const response = await api.get<UpcomingTest[]>('/schedules/upcoming', {
    params: { days },
  });
  return response.data;
};

export const updateSchedule = async (
  scheduleId: string,
  request: ScheduleUpdateRequest
): Promise<ScheduledTest> => {
  const response = await api.put<ScheduledTest>(`/schedules/${scheduleId}`, request);
  return response.data;
};

export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  await api.delete(`/schedules/${scheduleId}`);
};

export const toggleSchedule = async (scheduleId: string): Promise<ScheduledTest> => {
  const response = await api.post<ScheduledTest>(`/schedules/${scheduleId}/toggle`);
  return response.data;
};

// Analytics
export const getAnalyticsSummary = async (): Promise<AnalyticsSummary> => {
  const response = await api.get<AnalyticsSummary>('/analytics/');
  return response.data;
};

export const getPerformanceData = async (days: number = 30): Promise<PerformanceResponse> => {
  const response = await api.get<PerformanceResponse>('/analytics/performance', {
    params: { days },
  });
  return response.data;
};

export const getCategoryBreakdown = async (): Promise<CategoryBreakdownResponse> => {
  const response = await api.get<CategoryBreakdownResponse>('/analytics/categories');
  return response.data;
};

export const getOverallStats = async (): Promise<OverallStats> => {
  const response = await api.get<OverallStats>('/analytics/summary');
  return response.data;
};

export const getImprovementSuggestions = async (): Promise<SuggestionsResponse> => {
  const response = await api.get<SuggestionsResponse>('/analytics/suggestions');
  return response.data;
};

// Glossary
export const generateGlossary = async (request: GlossaryGenerateRequest): Promise<GlossaryGenerateResponse> => {
  const response = await api.post<GlossaryGenerateResponse>('/glossary/generate', request);
  return response.data;
};

export const getDocumentGlossaries = async (documentId: string): Promise<Glossary[]> => {
  const response = await api.get<Glossary[]>(`/glossary/document/${documentId}`);
  return response.data;
};

export const getGlossary = async (glossaryId: string): Promise<GlossaryWithTerms> => {
  const response = await api.get<GlossaryWithTerms>(`/glossary/${glossaryId}`);
  return response.data;
};

export const deleteGlossary = async (glossaryId: string): Promise<void> => {
  await api.delete(`/glossary/${glossaryId}`);
};

// Practice
export const generateFillInBlank = async (request: GenerateFillInBlankRequest): Promise<GeneratePracticeResponse> => {
  const response = await api.post<GeneratePracticeResponse>('/practice/fill-in-blank/generate', request);
  return response.data;
};

export const generateMatching = async (request: GenerateMatchingRequest): Promise<GeneratePracticeResponse> => {
  const response = await api.post<GeneratePracticeResponse>('/practice/matching/generate', request);
  return response.data;
};

export const listPracticeSessions = async (documentId?: string): Promise<PracticeSessionSummary[]> => {
  const response = await api.get<PracticeSessionSummary[]>('/practice/sessions', {
    params: documentId ? { document_id: documentId } : undefined,
  });
  return response.data;
};

export const getPracticeSession = async (sessionId: string): Promise<PracticeSession> => {
  const response = await api.get<PracticeSession>(`/practice/sessions/${sessionId}`);
  return response.data;
};

export const deletePracticeSession = async (sessionId: string): Promise<void> => {
  await api.delete(`/practice/sessions/${sessionId}`);
};

export const submitPractice = async (sessionId: string, submission: PracticeSubmission): Promise<PracticeResult> => {
  const response = await api.post<PracticeResult>(`/practice/sessions/${sessionId}/submit`, submission);
  return response.data;
};

// Favorites
export const listFavorites = async (itemType?: string): Promise<Favorite[]> => {
  const response = await api.get<Favorite[]>('/favorites', {
    params: itemType ? { item_type: itemType } : undefined,
  });
  return response.data;
};

export const addFavorite = async (request: AddFavoriteRequest): Promise<Favorite> => {
  const response = await api.post<Favorite>('/favorites', request);
  return response.data;
};

export const removeFavorite = async (favoriteId: string): Promise<void> => {
  await api.delete(`/favorites/${favoriteId}`);
};

export const removeFavoriteByItem = async (itemType: string, itemId: string): Promise<void> => {
  await api.delete(`/favorites/item/${itemType}/${itemId}`);
};

export const checkFavorite = async (itemType: string, itemId: string): Promise<FavoriteCheckResponse> => {
  const response = await api.get<FavoriteCheckResponse>(`/favorites/check/${itemType}/${itemId}`);
  return response.data;
};

// Search
export const searchContent = async (
  query: string,
  types?: string[],
  documentId?: string,
  limit?: number
): Promise<SearchResponse> => {
  const response = await api.get<SearchResponse>('/search', {
    params: {
      query,
      types: types?.join(','),
      document_id: documentId,
      limit,
    },
  });
  return response.data;
};

// Mind Maps
export const getDocumentMindMaps = async (documentId: string): Promise<MindMap[]> => {
  const response = await api.get<MindMap[]>(`/mindmaps/document/${documentId}`);
  return response.data;
};

export const generateMindMap = async (request: MindMapGenerateRequest): Promise<MindMapGenerateResponse> => {
  const response = await api.post<MindMapGenerateResponse>('/mindmaps/generate', request);
  return response.data;
};

export const getMindMap = async (mindmapId: string): Promise<MindMap> => {
  const response = await api.get<MindMap>(`/mindmaps/${mindmapId}`);
  return response.data;
};

export const deleteMindMap = async (mindmapId: string): Promise<void> => {
  await api.delete(`/mindmaps/${mindmapId}`);
};
