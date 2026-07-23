#!/usr/bin/env bash
# ~/.config/voxtype/gpt-cleanup.sh

set -euo pipefail

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  printf '%s\n' 'OPENAI_API_KEY is not set.' >&2
  exit 1
fi

input=$(cat)
model="${OPENAI_MODEL:-gpt-5.6-luna}"

instructions=$(cat <<'PROMPT'
Clean and improve this transcript:

Fix spelling, capitalization, and punctuation errors.
Convert number words to digits (twenty-five -> 25, ten percent -> 10%, five dollars -> $5).
Replace spoken punctuation with symbols (period -> ., comma -> ,, question mark -> ?).
Remove filler words (um, uh, like as filler, euh, ben, voila, etc.).
Correct grammar and syntax errors without changing the meaning.
Rephrase awkward or unclear sentences to make them natural, clear, and concise.
Keep the language of the original transcript (French stays French, English stays English, etc.).
Handle self-corrections: if the speaker starts a word or phrase then immediately corrects themselves, keep only the corrected version (for example, "I want to-- I need to call him" -> "I need to call him", "on va le faire lun-- vendredi" -> "on va le faire vendredi").
Infer and insert punctuation based on context and prosody:
Add periods (.) at the end of complete statements.
Add commas (,) to separate clauses, lists, or natural pauses within a sentence.
Add question marks (?) when the sentence is a question, even if not phrased as one explicitly.
Add exclamation marks (!) when the tone is clearly emphatic or excited.
Structure the text into paragraphs: start a new paragraph when the speaker shifts topic, changes idea, or after a significant pause in speech.
If the transcript ends with a formatting command, reformat the entire output accordingly. Supported commands:
"format:email" -> rewrite as a professional email (subject line, greeting, body, sign-off).
"format:email-casual" -> rewrite as a friendly, informal email.
"format:bullet" -> rewrite as a structured bullet-point list.
"format:summary" -> rewrite as a concise summary paragraph.
"format:report" -> rewrite as a formal report with sections and headings.
"format:sms" -> rewrite as a short, casual text message.
"format:post" -> rewrite as a social media post (concise, engaging).
"format:meeting-notes" -> rewrite as structured meeting notes with key points and action items.
If no command is detected, return the cleaned transcript as plain text.
Preserve the original meaning and intent. You may reorder words within a sentence for clarity, but do not add, remove, or alter any information.

Return only the final output, with no commentary or explanation.
PROMPT
)

payload=$(jq -n \
  --arg model "$model" \
  --arg instructions "$instructions" \
  --arg input "$input" \
  '{model: $model, instructions: $instructions, input: $input}')

response=$(curl --fail-with-body --silent --show-error https://api.openai.com/v1/responses \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d "$payload")

printf '%s\n' "$response" | jq -er '.output_text'
