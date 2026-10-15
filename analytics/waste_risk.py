"""Small PyMongo analytics example for the FoodBridge coursework project.

It uses a clear rule-based prediction so it is easy to explain in a viva:
short time left + larger quantity + no volunteer claim = higher waste risk.
"""

import os
from datetime import datetime

from dotenv import load_dotenv
from pymongo import MongoClient


def calculate_risk(listing, now):
    """Return a 0-100 risk score and the reasons behind it."""
    hours_left = max((listing["expiryAt"] - now).total_seconds() / 3600, 0)
    score = 0
    reasons = []

    if hours_left <= 2:
        score += 60
        reasons.append("expires within 2 hours")
    elif hours_left <= 6:
        score += 35
        reasons.append("expires within 6 hours")
    elif hours_left <= 12:
        score += 15
        reasons.append("expires within 12 hours")

    if listing.get("quantity", 0) >= 30:
        score += 25
        reasons.append("large quantity")
    elif listing.get("quantity", 0) >= 15:
        score += 10
        reasons.append("medium quantity")

    if not listing.get("claimedBy"):
        score += 15
        reasons.append("not yet claimed")

    return min(score, 100), reasons


def main():
    load_dotenv()
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI is missing. Copy .env.example to .env first.")

    client = MongoClient(uri)
    db = client.get_default_database()
    # PyMongo returns naive UTC datetimes by default, so use the same format
    # for comparisons. This keeps the example simple for students.
    now = datetime.utcnow()
    listings = db.foodlistings.find({"status": "available", "expiryAt": {"$gt": now}})

    recommendations = []
    for listing in listings:
        risk_score, reasons = calculate_risk(listing, now)
        if risk_score >= 40:
            recommendation = {
                "listingId": listing["_id"],
                "title": listing["title"],
                "riskScore": risk_score,
                "reasons": reasons,
                "generatedAt": now,
            }
            recommendations.append(recommendation)
            print(f"{listing['title']}: {risk_score}/100 - {', '.join(reasons)}")

    db.wasterecommendations.delete_many({})
    if recommendations:
        db.wasterecommendations.insert_many(recommendations)
    print(f"Saved {len(recommendations)} waste-risk recommendations.")
    client.close()


if __name__ == "__main__":
    main()
