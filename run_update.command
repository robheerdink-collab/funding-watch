#!/bin/bash
cd "$HOME/Documents/Claude/Funding watch"
python3 update_funding.py
echo ""
echo "Press any key to close..."
read -n 1
