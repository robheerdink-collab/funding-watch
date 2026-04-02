#!/bin/bash

# Zorg dat je Mac 'git' kan vinden als dit script onzichtbaar op de achtergrond draait
export PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin

# Ga naar de map, en stop direct als deze onverhoopt niet gevonden wordt (|| exit 1)
cd "/Users/robheerdink/Documents/Claude/Projects/Funding watch" || exit 1

# Zet index.html klaar
git add index.html

# Controleer eerst of er überhaupt wijzigingen zijn in index.html.
# Git geeft namelijk een foutmelding als je probeert te committen zonder wijzigingen.
if ! git diff --cached --quiet; then
    git commit -m "Daily funding update: $(date +%Y-%m-%d)"
    git push origin main
fi
