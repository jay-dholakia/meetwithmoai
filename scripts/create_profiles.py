#!/usr/bin/env python3
"""
Create 10 test profiles with v4 questionnaire responses and embeddings
"""
import os
import json
import uuid
from datetime import datetime
from supabase import create_client, Client
from openai import OpenAI
import time

# Supabase setup
supabase_url = "https://hgllvhohhyamsbljekrd.supabase.co"
# We'll need service role key - for now using anon key and will use MCP for admin operations

# OpenAI setup
openai_key = os.getenv("EXPO_PUBLIC_OPENAI_API_KEY")
if not openai_key:
    print("Error: EXPO_PUBLIC_OPENAI_API_KEY not set")
    exit(1)

openai_client = OpenAI(api_key=openai_key)

# Test profiles data (same as JS version)
profiles_data = [
    {
        "email": "sarah.tech@test.com",
        "first_name": "Sarah", "last_name": "Chen", "age": 28,
        "city": "San Francisco", "lat": 37.7749, "lng": -122.4194,
        "gender": "Female", "pronouns": "She/Her", "relationship_status": "Single", "has_kids": "No",
        "responses": {
            "q1_passionate_about": "I'm really into sustainable living and urban gardening. I've been learning about permaculture and trying to grow my own vegetables on my apartment balcony. Also really curious about how technology can help solve climate issues.",
            "q2_friends_describe": "My friends say I'm thoughtful, a bit introverted but warm once you get to know me. I'm the friend who remembers birthdays and brings homemade snacks to gatherings.",
            "q3_recharge_method": "I need quiet time alone - usually reading a book, doing yoga, or just sitting in a park. Too much socializing drains me, so I'm careful about balancing my energy.",
            "q4_time_energy": "Work is pretty demanding - I'm a software engineer working on climate tech. Also trying to maintain my garden and keep up with friends, which feels like a lot sometimes.",
            "q5_life_stage": "Career-focused (building my career)",
            "q6_industry": "Tech",
            "q7_day_to_day": "I code most of the day, attend meetings, and try to squeeze in a walk or gym session. Evenings are for cooking, reading, or catching up with friends.",
            "q8_work_relationship": "My career is definitely a big part of who I am. I chose this field because I want to make a difference, so it's not just a paycheck - it's meaningful to me.",
            "q9_weekends": "Saturday mornings at the farmers market, then either hiking, working on my garden, or having a low-key brunch with friends. Sundays are for meal prep and relaxation.",
            "q10_activities_enjoy": "Yoga, hiking, urban gardening, reading sci-fi novels, trying new vegetarian restaurants, and board games with friends.",
            "q11_talk_about_hours": "Climate solutions, books I've read, sustainable living practices, or deep conversations about life goals and values.",
            "q12_new_to_try": "I want to learn pottery and maybe join a community garden. Also thinking about taking a cooking class focused on plant-based cuisine.",
            "q13_food_music_books": "Food: I love exploring new vegetarian and vegan spots, especially Asian fusion. Music: Indie folk, electronic, and some jazz. Books: Sci-fi, climate fiction, and memoirs. Shows: The Last of Us, Severance, and nature documentaries.",
            "q14_friendship_cadence": "A few times a month",
            "q15_communication_preference": "Texting",
            "q16_planner_spontaneous": "Mostly a planner",
            "q17_drive_distance": "10 miles",
            "q18_availability_times": ["Weekend daytime", "Weekend evening"],
            "q19_age_range_preference": "Similar age (within 3 years)",
            "q20_issues_causes": "Climate change is my biggest concern. I'm also passionate about sustainable food systems and environmental justice. It keeps me up at night thinking about the future.",
            "q21_political_classification": "Liberal",
            "q22_political_alignment_important": "Very important",
            "q23_discuss_politics": "I prefer friends who share my views",
            "q24_friendship_matters_most": "Authenticity, shared values around sustainability, and people who understand my need for balance between social time and alone time.",
            "q25_kinds_of_friends": "I'm looking for activity partners for hiking and farmers market trips, and people who enjoy deep conversations about meaningful topics.",
            "q26_matcha_hopes": "I hope to find a few close friends who share my values and interests. Success would be having 2-3 people I can regularly do activities with and have meaningful conversations."
        }
    },
    # ... (other profiles would go here, but for brevity I'll create a script that generates SQL)
]

def generate_embedding(text):
    """Generate OpenAI embedding"""
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

print("This script would create profiles via Supabase admin API")
print("For now, we'll use MCP SQL directly...")
