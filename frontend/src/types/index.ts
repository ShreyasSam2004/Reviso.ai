// User and Auth types
export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
}

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size_bytes: number;
  page_count: number;
  status: ProcessingStatus;
  error_message: string | null;
  title: string | null;
  author: string | null;
  subject: string | null;
  total_chunks: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export type ProcessingStatus =
  | 'pending'
  | 'extracting'
  | 'chunking'
  | 'embedding'
  | 'completed'
  | 'failed';

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  page_numbers: number[];
  token_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type SummaryType = 'brief' | 'detailed' | 'key_points' | 'chapter' | 'custom';

export interface Summary {
  id: string;
  document_id: string;
  summary_type: SummaryType;
  content: string;
  model_used: string;
  created_at: string;
}

export interface SummaryRequest {
  document_id: string;
  summary_type: SummaryType;
  custom_instructions?: string;
  start_page?: number;
  end_page?: number;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  document_id: string;
  model_used: string;
}

export interface DocumentStatus {
  document_id: string;
  status: ProcessingStatus;
  error_message: string | null;
  progress: {
    step: number;
    message: string;
    total_steps: number;
  };
}

// Flashcard types
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Flashcard {
  id: string;
  deck_id: string;
  document_id: string;
  question: string;
  answer: string;
  difficulty: Difficulty;
  category: string;
  created_at: string;
}

export interface FlashcardDeck {
  id: string;
  document_id: string;
  name: string;
  card_count: number;
  created_at: string;
}

export interface FlashcardDeckWithCards extends FlashcardDeck {
  flashcards: Flashcard[];
}

export interface FlashcardGenerateRequest {
  document_id: string;
  num_cards: number;
  deck_name?: string;
}

export interface FlashcardGenerateResponse {
  deck_id: string;
  document_id: string;
  name: string;
  card_count: number;
  flashcards: Flashcard[];
}

// Mock Test types
export type QuestionType = 'mcq' | 'true_false';

export interface Question {
  id: string;
  test_id: string;
  question_type: QuestionType;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  category: string;
  difficulty: string;
  created_at: string;
}

export interface MockTest {
  id: string;
  document_id: string;
  name: string;
  question_count: number;
  time_limit_minutes: number | null;
  created_at: string;
}

export interface MockTestWithQuestions extends MockTest {
  questions: Question[];
}

export interface TestAttempt {
  id: string;
  test_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number | null;
  answers: Record<string, number>;
  started_at: string;
  completed_at: string | null;
}

export interface MockTestGenerateRequest {
  document_id: string;
  num_questions: number;
  test_name?: string;
  include_mcq: boolean;
  include_true_false: boolean;
  time_limit_minutes?: number;
}

export interface MockTestGenerateResponse {
  test_id: string;
  document_id: string;
  name: string;
  question_count: number;
  questions: Question[];
}

export interface TestSubmitRequest {
  answers: Record<string, number>;
  time_taken_seconds?: number;
}

export interface TestResultResponse {
  attempt_id: string;
  test_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number | null;
  question_results: QuestionResult[];
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  selected_answer: number;
  correct_answer: number;
  is_correct: boolean;
  explanation: string;
  category: string;
}

// Schedule types
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'custom';

export interface ScheduledTest {
  id: string;
  test_id: string;
  document_id: string;
  test_name: string;
  document_name: string;
  name: string;
  description: string;
  scheduled_time: string;
  recurrence: RecurrenceType;
  recurrence_days: number[];
  notification_minutes_before: number;
  is_active: boolean;
  created_at: string;
  next_occurrence: string | null;
}

export interface ScheduleCreateRequest {
  test_id: string;
  name: string;
  description?: string;
  scheduled_time: string;
  recurrence: RecurrenceType;
  recurrence_days?: number[];
  notification_minutes_before?: number;
}

export interface ScheduleUpdateRequest {
  name?: string;
  description?: string;
  scheduled_time?: string;
  recurrence?: RecurrenceType;
  recurrence_days?: number[];
  notification_minutes_before?: number;
  is_active?: boolean;
}

export interface UpcomingTest {
  schedule_id: string;
  test_id: string;
  test_name: string;
  document_name: string;
  scheduled_time: string;
  is_recurring: boolean;
}

// Analytics types
export interface PerformanceDataPoint {
  date: string;
  tests_taken: number;
  average_score: number;
  total_questions: number;
  correct_answers: number;
}

export interface CategoryPerformance {
  category: string;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface OverallStats {
  total_tests_taken: number;
  total_questions_answered: number;
  total_correct: number;
  overall_accuracy: number;
  average_score: number;
  best_score: number;
  worst_score: number;
  total_time_spent_seconds: number;
  tests_this_week: number;
  improvement_percentage: number | null;
}

export interface PerformanceResponse {
  data: PerformanceDataPoint[];
  period_start: string;
  period_end: string;
}

export interface CategoryBreakdownResponse {
  categories: CategoryPerformance[];
  strongest_category: string | null;
  weakest_category: string | null;
}

export interface ImprovementSuggestion {
  category: string;
  current_accuracy: number;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SuggestionsResponse {
  suggestions: ImprovementSuggestion[];
  overall_advice: string;
}

export interface AnalyticsSummary {
  overall_stats: OverallStats;
  recent_performance: PerformanceDataPoint[];
  category_breakdown: CategoryPerformance[];
  strongest_category: string | null;
  weakest_category: string | null;
}

// Glossary types
export type Importance = 'low' | 'medium' | 'high';

export interface KeyTerm {
  id: string;
  document_id: string;
  term: string;
  definition: string;
  category: string;
  importance: Importance;
  created_at: string;
}

export interface Glossary {
  id: string;
  document_id: string;
  name: string;
  term_count: number;
  created_at: string;
}

export interface GlossaryWithTerms extends Glossary {
  terms: KeyTerm[];
}

export interface GlossaryGenerateRequest {
  document_id: string;
  num_terms: number;
  name?: string;
}

export interface GlossaryGenerateResponse {
  glossary_id: string;
  document_id: string;
  name: string;
  term_count: number;
  terms: KeyTerm[];
}

// Practice types
export type PracticeType = 'fill_in_blank' | 'matching';

export interface FillInBlankQuestion {
  id: string;
  sentence: string;
  blank_word: string;
  hint?: string;
  context?: string;
}

export interface MatchingPair {
  id: string;
  term: string;
  definition: string;
}

export interface MatchingExercise {
  id: string;
  pairs: MatchingPair[];
}

export interface PracticeSession {
  id: string;
  document_id: string;
  practice_type: PracticeType;
  name: string;
  created_at: string;
  fill_in_blank_questions?: FillInBlankQuestion[];
  matching_exercise?: MatchingExercise;
}

export interface PracticeSessionSummary {
  id: string;
  document_id: string;
  practice_type: PracticeType;
  name: string;
  question_count: number;
  created_at: string;
}

export interface GenerateFillInBlankRequest {
  document_id: string;
  num_questions?: number;
  name?: string;
}

export interface GenerateMatchingRequest {
  document_id: string;
  num_pairs?: number;
  name?: string;
}

export interface GeneratePracticeResponse {
  session_id: string;
  document_id: string;
  practice_type: PracticeType;
  name: string;
  question_count: number;
}

export interface FillInBlankAnswer {
  question_id: string;
  user_answer: string;
}

export interface MatchingAnswer {
  matches: Record<string, string>;
}

export interface PracticeSubmission {
  session_id: string;
  fill_in_blank_answers?: FillInBlankAnswer[];
  matching_answers?: MatchingAnswer;
}

export interface FillInBlankResult {
  question_id: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  sentence: string;
}

export interface MatchingResult {
  term_id: string;
  term: string;
  user_matched_definition_id?: string;
  correct_definition_id: string;
  correct_definition: string;
  is_correct: boolean;
}

export interface PracticeResult {
  session_id: string;
  practice_type: PracticeType;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  fill_in_blank_results?: FillInBlankResult[];
  matching_results?: MatchingResult[];
}

// Search types
export interface SearchResult {
  id: string;
  type: 'document' | 'chunk' | 'summary' | 'flashcard' | 'key_term';
  title: string;
  content: string;
  document_id: string;
  document_name: string;
  relevance_score: number;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResult[];
}

// Favorites types
export interface Favorite {
  id: string;
  item_type: 'document' | 'flashcard_deck' | 'test' | 'glossary' | 'practice_session';
  item_id: string;
  item_name: string;
  document_name?: string;
  created_at: string;
}

export interface AddFavoriteRequest {
  item_type: string;
  item_id: string;
  item_name: string;
  document_name?: string;
}

export interface FavoriteCheckResponse {
  is_favorite: boolean;
  favorite_id?: string;
}
