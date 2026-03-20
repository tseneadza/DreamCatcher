# DreamCatcher Research Data Architecture

Internal reference document for the research data collection pipeline.

## Overview

DreamCatcher collects de-identified dream metadata for aggregate research purposes, subject to explicit user consent. This document describes the data model, collection pipeline, and safeguards.

## Data Model

### Table: research_consent

Tracks per-user consent status. References user_id for consent management only.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Integer | PK, auto-increment | Internal consent record ID |
| user_id | Integer | FK users.id, unique, not null | The user who granted or revoked consent |
| status | String(20) | Not null, check (active, revoked) | Current consent status |
| consent_version | String(20) | Not null | Version of consent language agreed to |
| consented_at | DateTime(tz) | Not null | When consent was granted |
| revoked_at | DateTime(tz) | Nullable | When consent was revoked |
| ip_hash | String(64) | Nullable | SHA-256 hash of IP at consent time (audit only) |
| created_at | DateTime(tz) | Server default now() | Record creation time |
| updated_at | DateTime(tz) | On update now() | Last modification time |

### Table: dream_research_events

De-identified dream data points. **No foreign key to users table.**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String(36) | PK, UUID | Globally unique event identifier |
| consent_id | Integer | FK research_consent.id, not null, cascade delete | Links to consent record |
| emotion | String(50) | Nullable | Primary emotion label |
| theme | String(100) | Nullable | Primary theme category |
| is_lucid | Boolean | Not null, default false | Whether dream was lucid |
| mood_score | Integer | Check 1-5, nullable | Mood rating |
| sleep_quality | Integer | Check 1-5, nullable | Sleep quality from linked log |
| dream_type | String(20) | Nullable | normal/nightmare/lucid/daydream |
| vividness | Integer | Check 1-5, nullable | Vividness rating |
| is_recurring | Boolean | Default false | Whether dream is recurring |
| day_of_week | Integer | Nullable | 0=Monday, 6=Sunday |
| month | Integer | Nullable | 1-12 |
| age_bracket | String(10) | Nullable | Bucketed age range |
| region | String(50) | Nullable | Coarse region |
| created_at | DateTime(tz) | Server default now() | When event was extracted |

### Table: dream_research_aggregates

Pre-computed aggregate statistics with k-anonymity enforcement.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Integer | PK, auto-increment | Aggregate record ID |
| period_type | String(10) | Not null, check (daily, weekly, monthly) | Aggregation granularity |
| period_start | Date | Not null | Start of aggregation window |
| period_end | Date | Not null | End of aggregation window |
| sample_size | Integer | Not null, check >= 5 | Number of events (k-anonymity threshold) |
| emotion_counts | JSON | Not null | Emotion label to count mapping |
| theme_counts | JSON | Not null | Theme to count mapping |
| lucid_rate | Float | Check 0.0-1.0 | Proportion of lucid dreams |
| avg_mood | Float | Check 1.0-5.0, nullable | Mean mood score |
| avg_sleep_quality | Float | Check 1.0-5.0, nullable | Mean sleep quality |
| created_at | DateTime(tz) | Server default now() | When aggregate was computed |

## Collection Pipeline

```
Dream Created/Updated
       |
       v
  User has active consent? --No--> Skip
       | Yes
       v
  Extract de-identified fields:
    - Emotion labels (controlled vocabulary only)
    - Theme categories (no proper nouns)
    - Mood, lucidity, vividness scores
    - Day of week, month from dream date
    - Sleep quality from linked log (if available)
    - Demographic brackets (if user provided)
       |
       v
  Insert DreamResearchEvent (linked to consent_id, NOT user_id)
```

## Safeguards

- **k-anonymity:** Aggregates only produced when sample_size >= 5
- **No identity:** Research events contain no user_id, email, or name
- **Controlled vocabulary:** AI theme extraction uses predefined category list
- **Cascade deletion:** Revoking consent hard-deletes all associated research events
- **Audit trail:** Consent grants and revocations are timestamped
