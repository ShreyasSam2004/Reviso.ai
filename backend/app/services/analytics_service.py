"""Analytics service for performance tracking and reporting."""

import json
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import TestAttemptDB, QuestionDB, MockTestDB
from ..models.analytics import (
    PerformanceDataPoint,
    CategoryPerformance,
    OverallStats,
    PerformanceResponse,
    CategoryBreakdownResponse,
    ImprovementSuggestion,
    SuggestionsResponse,
    AnalyticsSummaryResponse,
)


class AnalyticsService:
    """Service for generating analytics and reports."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_performance_over_time(self, days: int = 30) -> PerformanceResponse:
        """Get performance data over a period of time."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        result = await self.session.execute(
            select(TestAttemptDB)
            .where(TestAttemptDB.completed_at >= start_date)
            .order_by(TestAttemptDB.completed_at)
        )
        attempts = result.scalars().all()

        # Group by date
        daily_data: dict[str, list[TestAttemptDB]] = defaultdict(list)
        for attempt in attempts:
            if attempt.completed_at:
                date_key = attempt.completed_at.strftime('%Y-%m-%d')
                daily_data[date_key].append(attempt)

        # Generate data points
        data_points = []
        for date_key, day_attempts in sorted(daily_data.items()):
            total_score = sum(a.score for a in day_attempts)
            total_questions = sum(a.total_questions for a in day_attempts)
            total_correct = sum(a.correct_answers for a in day_attempts)

            data_points.append(PerformanceDataPoint(
                date=date_key,
                tests_taken=len(day_attempts),
                average_score=total_score / len(day_attempts) if day_attempts else 0,
                total_questions=total_questions,
                correct_answers=total_correct,
            ))

        return PerformanceResponse(
            data=data_points,
            period_start=start_date.strftime('%Y-%m-%d'),
            period_end=end_date.strftime('%Y-%m-%d'),
        )

    async def get_category_breakdown(self) -> CategoryBreakdownResponse:
        """Get performance breakdown by category."""
        # Get all test attempts with their questions
        attempts_result = await self.session.execute(
            select(TestAttemptDB)
            .where(TestAttemptDB.completed_at.isnot(None))
        )
        attempts = attempts_result.scalars().all()

        # Aggregate by category
        category_stats: dict[str, dict] = defaultdict(lambda: {
            'total': 0,
            'correct': 0,
            'recent_total': 0,
            'recent_correct': 0,
        })

        recent_cutoff = datetime.utcnow() - timedelta(days=7)

        for attempt in attempts:
            answers = json.loads(attempt.answers) if attempt.answers else {}

            # Get questions for this attempt's test
            questions_result = await self.session.execute(
                select(QuestionDB).where(QuestionDB.test_id == attempt.test_id)
            )
            questions = {q.id: q for q in questions_result.scalars().all()}

            for question_id, selected_answer in answers.items():
                question = questions.get(question_id)
                if not question:
                    continue

                category = question.category or 'General'
                is_correct = selected_answer == question.correct_answer
                is_recent = attempt.completed_at and attempt.completed_at >= recent_cutoff

                category_stats[category]['total'] += 1
                if is_correct:
                    category_stats[category]['correct'] += 1

                if is_recent:
                    category_stats[category]['recent_total'] += 1
                    if is_correct:
                        category_stats[category]['recent_correct'] += 1

        # Calculate performance for each category
        categories = []
        for category, stats in category_stats.items():
            total = stats['total']
            correct = stats['correct']
            accuracy = (correct / total * 100) if total > 0 else 0

            # Determine trend
            recent_total = stats['recent_total']
            recent_correct = stats['recent_correct']
            recent_accuracy = (recent_correct / recent_total * 100) if recent_total > 0 else 0

            older_total = total - recent_total
            older_correct = correct - recent_correct
            older_accuracy = (older_correct / older_total * 100) if older_total > 0 else 0

            if recent_total < 3 or older_total < 3:
                trend = 'stable'
            elif recent_accuracy > older_accuracy + 5:
                trend = 'improving'
            elif recent_accuracy < older_accuracy - 5:
                trend = 'declining'
            else:
                trend = 'stable'

            categories.append(CategoryPerformance(
                category=category,
                total_questions=total,
                correct_answers=correct,
                accuracy=round(accuracy, 1),
                trend=trend,
            ))

        # Sort by total questions (most practiced first)
        categories.sort(key=lambda x: x.total_questions, reverse=True)

        # Find strongest and weakest (with minimum threshold)
        significant_categories = [c for c in categories if c.total_questions >= 5]
        strongest = max(significant_categories, key=lambda x: x.accuracy).category if significant_categories else None
        weakest = min(significant_categories, key=lambda x: x.accuracy).category if significant_categories else None

        return CategoryBreakdownResponse(
            categories=categories,
            strongest_category=strongest,
            weakest_category=weakest,
        )

    async def get_overall_stats(self) -> OverallStats:
        """Get overall performance statistics."""
        result = await self.session.execute(
            select(TestAttemptDB).where(TestAttemptDB.completed_at.isnot(None))
        )
        attempts = list(result.scalars().all())

        if not attempts:
            return OverallStats(
                total_tests_taken=0,
                total_questions_answered=0,
                total_correct=0,
                overall_accuracy=0,
                average_score=0,
                best_score=0,
                worst_score=0,
                total_time_spent_seconds=0,
                tests_this_week=0,
                improvement_percentage=None,
            )

        total_questions = sum(a.total_questions for a in attempts)
        total_correct = sum(a.correct_answers for a in attempts)
        scores = [a.score for a in attempts]
        total_time = sum(a.time_taken_seconds or 0 for a in attempts)

        # Tests this week
        week_ago = datetime.utcnow() - timedelta(days=7)
        tests_this_week = sum(1 for a in attempts if a.completed_at and a.completed_at >= week_ago)

        # Calculate improvement (compare last 5 vs previous 5)
        improvement = None
        if len(attempts) >= 10:
            sorted_attempts = sorted(attempts, key=lambda x: x.completed_at or datetime.min)
            recent_5 = sorted_attempts[-5:]
            previous_5 = sorted_attempts[-10:-5]
            recent_avg = sum(a.score for a in recent_5) / 5
            previous_avg = sum(a.score for a in previous_5) / 5
            improvement = round(recent_avg - previous_avg, 1)

        return OverallStats(
            total_tests_taken=len(attempts),
            total_questions_answered=total_questions,
            total_correct=total_correct,
            overall_accuracy=round((total_correct / total_questions * 100) if total_questions > 0 else 0, 1),
            average_score=round(sum(scores) / len(scores) if scores else 0, 1),
            best_score=round(max(scores) if scores else 0, 1),
            worst_score=round(min(scores) if scores else 0, 1),
            total_time_spent_seconds=total_time,
            tests_this_week=tests_this_week,
            improvement_percentage=improvement,
        )

    async def get_improvement_suggestions(self) -> SuggestionsResponse:
        """Get AI-powered improvement suggestions based on performance."""
        category_data = await self.get_category_breakdown()
        overall = await self.get_overall_stats()

        suggestions = []

        # Analyze weak categories
        for category in category_data.categories:
            if category.total_questions < 5:
                continue

            priority = 'low'
            suggestion = ''

            if category.accuracy < 50:
                priority = 'high'
                suggestion = f"Focus on reviewing {category.category} fundamentals. Your accuracy is below 50%, indicating gaps in basic concepts."
            elif category.accuracy < 70:
                priority = 'medium'
                suggestion = f"Practice more {category.category} questions. Consider reviewing your incorrect answers to identify patterns."
            elif category.trend == 'declining':
                priority = 'medium'
                suggestion = f"Your {category.category} performance is declining. Review recent mistakes and revisit the material."

            if suggestion:
                suggestions.append(ImprovementSuggestion(
                    category=category.category,
                    current_accuracy=category.accuracy,
                    suggestion=suggestion,
                    priority=priority,
                ))

        # Sort by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        suggestions.sort(key=lambda x: priority_order[x.priority])

        # Generate overall advice
        if overall.total_tests_taken == 0:
            overall_advice = "Take some practice tests to start tracking your progress!"
        elif overall.overall_accuracy >= 80:
            overall_advice = "Excellent performance! Keep up the great work. Consider challenging yourself with harder questions."
        elif overall.overall_accuracy >= 60:
            overall_advice = "Good progress! Focus on your weak areas to improve further. Regular practice will help consolidate your knowledge."
        else:
            overall_advice = "Keep practicing! Focus on understanding the fundamentals before moving to advanced topics. Review your incorrect answers carefully."

        if overall.improvement_percentage is not None:
            if overall.improvement_percentage > 0:
                overall_advice += f" Your recent performance has improved by {overall.improvement_percentage}%!"
            elif overall.improvement_percentage < -5:
                overall_advice += " Your recent scores have dropped - consider slowing down and reviewing the basics."

        return SuggestionsResponse(
            suggestions=suggestions[:5],  # Top 5 suggestions
            overall_advice=overall_advice,
        )

    async def get_analytics_summary(self) -> AnalyticsSummaryResponse:
        """Get a comprehensive analytics summary."""
        overall = await self.get_overall_stats()
        performance = await self.get_performance_over_time(14)  # Last 2 weeks
        categories = await self.get_category_breakdown()

        return AnalyticsSummaryResponse(
            overall_stats=overall,
            recent_performance=performance.data,
            category_breakdown=categories.categories,
            strongest_category=categories.strongest_category,
            weakest_category=categories.weakest_category,
        )
