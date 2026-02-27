from typing import Optional
from openai import OpenAI
from config import get_settings

settings = get_settings()


class AIService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
    
    def is_available(self) -> bool:
        return self.client is not None and bool(settings.openai_api_key)
    
    async def interpret_dream(self, dream_content: str, mood: int, tags: list[str]) -> str:
        if not self.is_available():
            return self._fallback_interpretation(dream_content, tags)
        
        mood_descriptions = {
            1: "very negative/distressing",
            2: "somewhat negative",
            3: "neutral",
            4: "positive",
            5: "very positive/euphoric"
        }
        
        prompt = f"""Analyze this dream and provide a thoughtful interpretation:

Dream content: {dream_content}
Emotional tone: {mood_descriptions.get(mood, 'neutral')}
Themes/tags: {', '.join(tags) if tags else 'none specified'}

Provide a concise interpretation (2-3 paragraphs) that:
1. Identifies key symbols and their possible meanings
2. Explores potential emotional or psychological significance
3. Offers constructive insights the dreamer might consider

Be supportive and insightful, not prescriptive. Acknowledge that dream interpretation is subjective."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a thoughtful dream analyst who provides insightful, supportive interpretations of dreams. You draw on common dream symbolism and psychological concepts while acknowledging the personal nature of dream meaning."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI error: {e}")
            return self._fallback_interpretation(dream_content, tags)
    
    async def suggest_goal_steps(self, goal_title: str, goal_description: str, category: str) -> str:
        if not self.is_available():
            return self._fallback_goal_suggestions(goal_title, category)
        
        prompt = f"""Help create actionable steps for this goal:

Goal: {goal_title}
Description: {goal_description or 'No description provided'}
Category: {category}

Provide 3-5 specific, actionable steps to help achieve this goal. Be practical and encouraging."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a supportive life coach who helps people break down their goals into actionable steps."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI error: {e}")
            return self._fallback_goal_suggestions(goal_title, category)
    
    async def analyze_sleep_patterns(self, sleep_data: list[dict]) -> str:
        if not self.is_available() or len(sleep_data) < 3:
            return "Not enough sleep data for analysis. Log at least 3 nights to get insights."
        
        summary = "\n".join([
            f"- Sleep: {d['sleep_time']}, Wake: {d['wake_time']}, Quality: {d['quality']}/5"
            for d in sleep_data[:14]
        ])
        
        prompt = f"""Analyze these sleep patterns and provide insights:

{summary}

Provide:
1. Overall sleep quality assessment
2. Any patterns you notice
3. 2-3 actionable suggestions for improvement"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a sleep health advisor who analyzes sleep patterns and provides supportive, practical advice."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI error: {e}")
            return "Unable to analyze sleep patterns at this time."
    
    async def brainstorm_ideas(self, idea_content: str, category: Optional[str]) -> str:
        if not self.is_available():
            return "AI brainstorming not available. Try breaking your idea into smaller parts or exploring related concepts."
        
        prompt = f"""Help expand on this idea:

Idea: {idea_content}
Category: {category or 'General'}

Provide:
1. 2-3 ways to develop this idea further
2. Potential challenges to consider
3. Related ideas worth exploring"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a creative thinking partner who helps develop and expand ideas."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.8
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI error: {e}")
            return "Unable to brainstorm at this time."
    
    def _fallback_interpretation(self, content: str, tags: list[str]) -> str:
        interpretation = "Dream analysis requires OpenAI API key configuration. "
        if tags:
            interpretation += f"Your dream contains themes of: {', '.join(tags)}. "
        interpretation += "Consider what these elements mean to you personally and how they might relate to your waking life."
        return interpretation
    
    def _fallback_goal_suggestions(self, title: str, category: str) -> str:
        suggestions = {
            "personal": "Consider breaking this into daily habits, tracking progress weekly, and celebrating small wins.",
            "career": "Network with others in your field, set measurable milestones, and seek feedback regularly.",
            "health": "Start small, be consistent, track your progress, and don't be afraid to adjust your approach.",
            "learning": "Set specific study times, use active recall methods, and teach what you learn to others.",
            "financial": "Create a budget, automate savings, and review your progress monthly.",
        }
        return suggestions.get(category, "Break your goal into smaller steps, set deadlines, and track your progress regularly.")


ai_service = AIService()
