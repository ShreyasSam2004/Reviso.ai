"""Analytics models for performance tracking."""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class PerformanceDataPoint(BaseModel):
    """Single data point for performance over time."""
    date: str
    tests_taken: int
    average_score: float
    total_questions: int
    correct_answers: int


class CategoryPerformance(BaseModel):
    """Performance breakdown by category."""
    category: str
    total_questions: int
    correct_answers: int
    accuracy: float
    trend: str  # improving, declining, stable


class OverallStats(BaseModel):
    """Overall performance statistics."""
    total_tests_taken: int
    total_questions_answered: int
    total_correct: int
    overall_accuracy: float
    average_score: float
    best_score: float
    worst_score: float
    total_time_spent_seconds: int
    tests_this_week: int
    improvement_percentage: Optional[float] = None


class PerformanceResponse(BaseModel):
    """Response for performance over time."""
    data: list[PerformanceDataPoint]
    period_start: str
    period_end: str


class CategoryBreakdownResponse(BaseModel):
    """Response for category breakdown."""
    categories: list[CategoryPerformance]
    strongest_category: Optional[str] = None
    weakest_category: Optional[str] = None


class ImprovementSuggestion(BaseModel):
    """AI-powered improvement suggestion."""
    category: str
    current_accuracy: float
    suggestion: str
    priority: str  # high, medium, low


class SuggestionsResponse(BaseModel):
    """Response for improvement suggestions."""
    suggestions: list[ImprovementSuggestion]
    overall_advice: str


class AnalyticsSummaryResponse(BaseModel):
    """Combined analytics summary."""
    overall_stats: OverallStats
    recent_performance: list[PerformanceDataPoint]
    category_breakdown: list[CategoryPerformance]
    strongest_category: Optional[str] = None
    weakest_category: Optional[str] = None
