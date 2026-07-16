#!/bin/bash

# Script to seed data for both planeta-tierra and planeta-marte
# Usage: ./seed.sh tierra|marte

PLANETA=${1:-tierra}

if [ "$PLANETA" = "tierra" ]; then
  NEO4J_URI="bolt://localhost:7687"
  NEO4J_PORT="7687"
elif [ "$PLANETA" = "marte" ]; then
  NEO4J_URI="bolt://localhost:7688"
  NEO4J_PORT="7688"
else
  echo "Usage: $0 [tierra|marte]"
  exit 1
fi

export NEO4J_URI="$NEO4J_URI"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="password"

echo "🌍 Seeding data for planeta-$PLANETA"
echo "   URI: $NEO4J_URI"

cd "$(dirname "$0")"
npx ts-node seed-data.ts
