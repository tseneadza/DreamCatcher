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
    
    async def auto_tag_dream(self, content: str, mood: int) -> dict:
        if not self.is_available():
            return self._fallback_auto_tag(content, mood)

        mood_descriptions = {
            1: "very negative/distressing",
            2: "somewhat negative",
            3: "neutral",
            4: "positive",
            5: "very positive/euphoric"
        }

        prompt = f"""Analyze this dream and extract structured metadata.

Dream content: {content}
Emotional tone: {mood_descriptions.get(mood, 'neutral')}

Return a JSON object with exactly these fields:
- "emotions": list of 1-5 emotion labels (e.g. "fear", "joy", "anxiety", "wonder")
- "characters": list of people/beings mentioned (e.g. "mother", "stranger", "dog")
- "locations": list of places mentioned (e.g. "house", "forest", "school")
- "dream_type": one of "normal", "nightmare", "lucid", "daydream"
- "lucidity_level": integer 0-5 (0=no awareness, 5=full control)

Return ONLY valid JSON, no other text."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a dream analysis tool that extracts structured metadata from dream descriptions. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.3
            )
            import json
            result = json.loads(response.choices[0].message.content)
            return {
                "emotions": result.get("emotions", [])[:5],
                "characters": result.get("characters", [])[:10],
                "locations": result.get("locations", [])[:10],
                "dream_type": result.get("dream_type", "normal") if result.get("dream_type") in ("normal", "nightmare", "lucid", "daydream") else "normal",
                "lucidity_level": max(0, min(5, int(result.get("lucidity_level", 0)))),
            }
        except Exception as e:
            print(f"OpenAI auto-tag error: {e}")
            return self._fallback_auto_tag(content, mood)

    def _fallback_auto_tag(self, content: str, mood: int) -> dict:
        content_lower = content.lower()

        emotions = []
        emotion_keywords = {
            "fear": ["scared", "afraid", "fear", "terrified", "panic"],
            "joy": ["happy", "joy", "laugh", "fun", "excited"],
            "sadness": ["sad", "cry", "tears", "grief", "loss"],
            "anxiety": ["anxious", "worry", "nervous", "stress", "uneasy"],
            "anger": ["angry", "rage", "furious", "mad", "frustrat"],
            "wonder": ["amazing", "beautiful", "wonder", "awe", "magical"],
            "confusion": ["confused", "lost", "uncertain", "strange", "weird"],
        }
        for emotion, keywords in emotion_keywords.items():
            if any(kw in content_lower for kw in keywords):
                emotions.append(emotion)

        dream_type = "normal"
        if mood <= 2 and any(w in content_lower for w in ["nightmare", "terror", "chase", "monster", "death"]):
            dream_type = "nightmare"
        elif any(w in content_lower for w in ["lucid", "realized i was dreaming", "knew it was a dream", "controlled"]):
            dream_type = "lucid"

        lucidity_level = 3 if dream_type == "lucid" else 0

        return {
            "emotions": emotions[:5] if emotions else ["neutral"],
            "characters": [],
            "locations": [],
            "dream_type": dream_type,
            "lucidity_level": lucidity_level,
        }

    async def analyze_dream_patterns(self, dreams: list[dict]) -> dict:
        fallback = {
            "recurring_symbols": [],
            "emotional_trends": [],
            "temporal_patterns": [],
            "summary": "Not enough dream data for pattern analysis." if len(dreams) < 3 else "Pattern analysis requires AI configuration.",
        }

        if not self.is_available() or len(dreams) < 3:
            return fallback

        dream_summaries = "\n".join([
            f"- Content: {d.get('content', '')[:200]} | Emotions: {', '.join(d.get('emotions', []))} | Tags: {', '.join(d.get('tags', []))} | Type: {d.get('dream_type', 'normal')} | Mood: {d.get('mood', 3)}/5"
            for d in dreams[:30]
        ])

        prompt = f"""Analyze these dreams from the past period and identify patterns:

{dream_summaries}

Return a JSON object with exactly these fields:
- "recurring_symbols": list of up to 8 symbols/themes that appear repeatedly
- "emotional_trends": list of up to 5 emotional patterns observed (e.g. "increasing anxiety", "consistent joy")
- "temporal_patterns": list of up to 3 time-based patterns (e.g. "nightmares cluster on weekdays")
- "summary": a 2-3 sentence overview of the dreamer's pattern landscape

Return ONLY valid JSON, no other text."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a dream pattern analyst. You identify recurring themes, emotional trends, and temporal patterns across a series of dreams. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,
                temperature=0.5
            )
            import json
            result = json.loads(response.choices[0].message.content)
            return {
                "recurring_symbols": result.get("recurring_symbols", [])[:8],
                "emotional_trends": result.get("emotional_trends", [])[:5],
                "temporal_patterns": result.get("temporal_patterns", [])[:3],
                "summary": result.get("summary", "Analysis complete."),
            }
        except Exception as e:
            print(f"OpenAI pattern analysis error: {e}")
            return fallback

    async def dream_to_ideas(self, dream_content: str, dream_emotions: list[str]) -> dict:
        fallback = {
            "ideas": [
                {"content": "Reflect on the emotions in your dream and journal about them.", "category": "personal", "reasoning": "Dreams often surface unprocessed feelings."},
                {"content": "Create art inspired by the imagery in your dream.", "category": "creative", "reasoning": "Dream visuals can spark creative expression."},
            ]
        }

        if not self.is_available():
            return fallback

        prompt = f"""Based on this dream, generate creative and actionable ideas the dreamer could pursue:

Dream content: {dream_content}
Emotions felt: {', '.join(dream_emotions) if dream_emotions else 'not specified'}

Return a JSON object with exactly this field:
- "ideas": list of 3-5 objects, each with:
  - "content": a specific, actionable idea (1-2 sentences)
  - "category": one of "personal", "creative", "career", "health", "learning", "social"
  - "reasoning": brief explanation of how the dream inspired this idea

Return ONLY valid JSON, no other text."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a creative ideation coach who helps people transform dream imagery and emotions into actionable real-life ideas. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.8
            )
            import json
            result = json.loads(response.choices[0].message.content)
            ideas = result.get("ideas", [])[:5]
            return {"ideas": [
                {
                    "content": idea.get("content", ""),
                    "category": idea.get("category", "personal"),
                    "reasoning": idea.get("reasoning", ""),
                }
                for idea in ideas if idea.get("content")
            ]}
        except Exception as e:
            print(f"OpenAI dream-to-ideas error: {e}")
            return fallback

    async def explore_dream(self, dream_content: str, question: str) -> dict:
        fallback = {
            "answer": "AI exploration is not available right now. Try reflecting on your question by journaling about what this dream element means to you personally.",
            "follow_up_questions": [
                "What emotion did this part of the dream evoke?",
                "Does this remind you of anything in your waking life?",
                "How would you change this dream if you could?",
            ],
        }

        if not self.is_available():
            return fallback

        prompt = f"""The user wants to explore their dream through conversation.

Dream content: {dream_content}

User's question: {question}

Return a JSON object with exactly these fields:
- "answer": a thoughtful, supportive response (2-3 paragraphs) that explores the question in the context of the dream
- "follow_up_questions": list of 3 follow-up questions the user might want to explore next

Return ONLY valid JSON, no other text."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a compassionate dream exploration guide. You help people understand their dreams through Socratic dialogue, drawing on dream symbolism and psychology. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,
                temperature=0.7
            )
            import json
            result = json.loads(response.choices[0].message.content)
            return {
                "answer": result.get("answer", "I couldn't generate a response."),
                "follow_up_questions": result.get("follow_up_questions", [])[:3],
            }
        except Exception as e:
            print(f"OpenAI explore dream error: {e}")
            return fallback

    async def goal_dream_alignment(self, goal_title: str, goal_description: str, dreams_summary: str) -> dict:
        fallback = {
            "alignment_score": 0.5,
            "analysis": "AI alignment analysis is not available. Consider journaling about how your dreams relate to this goal.",
            "relevant_themes": [],
        }

        if not self.is_available():
            return fallback

        prompt = f"""Analyze the alignment between this goal and the user's recent dreams.

Goal: {goal_title}
Goal description: {goal_description or 'No description'}

Recent dreams summary:
{dreams_summary}

Return a JSON object with exactly these fields:
- "alignment_score": float between 0.0 and 1.0 (0 = no alignment, 1 = strong alignment)
- "analysis": 2-3 sentences explaining the alignment (or lack thereof) between dreams and this goal
- "relevant_themes": list of up to 5 dream themes that relate to this goal

Return ONLY valid JSON, no other text."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a dream-goal alignment analyst who identifies connections between a person's subconscious dream patterns and their conscious goals. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.5
            )
            import json
            result = json.loads(response.choices[0].message.content)
            score = float(result.get("alignment_score", 0.5))
            return {
                "alignment_score": max(0.0, min(1.0, score)),
                "analysis": result.get("analysis", "Analysis unavailable."),
                "relevant_themes": result.get("relevant_themes", [])[:5],
            }
        except Exception as e:
            print(f"OpenAI goal-dream alignment error: {e}")
            return fallback

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
