#!/bin/bash
git branch -r | grep -v 'origin/main' | sed 's/origin\///' | xargs -I {} git push origin --delete {}
git branch | grep -v "main" | xargs git branch -D