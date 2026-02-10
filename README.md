# The Oracle - Alexa to Gemini Voice Bridge

Turn your Amazon Echo into a smart AI assistant by connecting Alexa to Google's Gemini AI.

Say **"Alexa, open the oracle"** and then ask anything — get intelligent, conversational answers powered by Gemini 2.5 Flash-Lite.

## Features

- **Natural conversation** — Multi-turn context is maintained within a session
- **Follow-ups** — Say "tell me more" or "elaborate" to continue the conversation
- **Voice-optimized** — Responses are concise and natural for spoken delivery
- **Conversation history** — Gemini remembers what you discussed in the current session

## Prerequisites

- An Amazon Echo device (any model) or the Alexa app
- An Amazon Developer account ([developer.amazon.com](https://developer.amazon.com))
- A Google Gemini API key ([aistudio.google.com](https://aistudio.google.com/app/apikey))

## Quick Setup

### 1. Create an Alexa-Hosted Skill

1. Go to the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Click **Create Skill** > Choose **Custom** model > **Alexa-Hosted (Node.js)**
3. Name it anything you like (e.g., "The Oracle")

### 2. Set Up the Interaction Model

1. In the skill console, go to **Build** > **Interaction Model** > **JSON Editor**
2. Paste the contents of `AlexatoGemini/skill-package/interactionModels/custom/en-IN.json`
3. Click **Save** and then **Build Model**

### 3. Add the Lambda Code

1. Go to the **Code** tab in the Alexa Developer Console
2. Replace `index.js` with the contents of `AlexatoGemini/lambda/index.js`
3. Replace `package.json` with the contents of `AlexatoGemini/lambda/package.json`

### 4. Add Your Gemini API Key

In the `index.js` file, replace `YOUR_GEMINI_API_KEY_HERE` with your actual Gemini API key.

> **Security Note:** For production use, store the key as a Lambda environment variable rather than hardcoding it. See [AWS Lambda environment variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html).

### 5. Deploy and Test

1. Click **Deploy** in the Code tab
2. Go to the **Test** tab and enable testing in "Development"
3. Try: `open the oracle` then `tell me about quantum computing`

## Usage Examples

| You say | What happens |
|---------|-------------|
| "Alexa, open the oracle" | Launches the skill |
| "Tell me about photosynthesis" | Gemini answers your question |
| "Tell me more" | Gemini elaborates on the previous answer |
| "What is quantum computing" | Ask a new question in the same session |
| "Stop" | Ends the session |

## Project Structure

```
AlexatoGemini/
├── lambda/
│   ├── index.js          # Main Lambda handler (Alexa + Gemini integration)
│   ├── package.json       # Node.js dependencies
│   ├── local-debugger.js  # Local debugging utility
│   └── util.js            # Utility functions
└── skill-package/
    ├── skill.json         # Skill manifest
    └── interactionModels/
        └── custom/
            └── en-IN.json # Voice interaction model
```

## Getting Your Gemini API Key (Free)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key and paste it into `index.js`

The free tier includes generous usage limits that are more than enough for personal use.

## License

This project is for educational and personal use. See the respective terms of service for [Amazon Alexa](https://developer.amazon.com/support/legal/tou) and [Google Gemini API](https://ai.google.dev/terms).
