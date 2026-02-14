# Schema reference (matching & intake)

## Source of truth for matching

- **Age range** and **travel distance (radius)** are stored **only in intake** and read from there by `replenish-matches`. Profile columns `profiles.age_range_preference` and `profiles.radius_km` are legacy and no longer written by the app; matching uses intake only.

## intake_responses_v5

- **user_id** (PK), **responses** (JSONB), **life_stage** (array, legacy), **availability_times** (array), **embed_vector**, **completed_at**, **updated_at**, **created_at**.
- **responses**: array of `{ question_id, question_text, answer, type, answered_at }`. Question IDs match `data/AIAgentScreen.ts` intakeQuestions.
- Matching preferences in intake:
  - **q7_age_range** – slider ±0–15 years (stored as e.g. `"± 5 years"`). Replenish parses to number.
  - **q10_travel_distance_miles** – slider 0–50 miles (stored as e.g. `"15 miles"`). Replenish parses to number and converts to km.
  - **q1_connection_types** – multi-select (up to 5).
  - **q6_availability** – multi-select; also denormalized to **availability_times** on the row.

## profiles

- Identity and location: **first_name**, **last_name**, **birthdate**, **gender**, **pronouns**, **city**, **lat**, **lng**, **avatar_url**, **bio_text**, **is_active**, **is_paused**, **in_match_bowl**, etc.
- **radius_km** – legacy; not set by onboarding. Matching uses intake **q10_travel_distance_miles** (default 40 km if missing).
- **age_range_preference** – legacy; not set by app. Matching uses intake **q7_age_range** (null if missing = no age filter).

## Onboarding vs intake

- **Onboarding** (profile): name, last name, birthdate, gender, pronouns, sexual orientation, relationship status, has kids, **location**. No radius step.
- **Intake** (Liv): connection types, conversation style, time focus, free time, availability, optional background/first-conversation, then **q7_age_range** and **q10_travel_distance_miles** at the end.
