const Alexa = require('ask-sdk-core');
const fetch = require('node-fetch');

var GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE"; // Set via Lambda env var

var SYSTEM_PROMPT = "You are a helpful voice assistant called The Oracle. " +
  "Keep answers concise (2-4 sentences) and natural for spoken delivery. " +
  "Avoid bullet points, markdown, asterisks, or special characters. " +
  "Use plain spoken English. If asked to elaborate, give more detail but stay under 5 sentences.";

var MAX_HISTORY_TURNS = 4;

function trimHistory(history) {
  if (history.length <= 2 + MAX_HISTORY_TURNS * 2) return history;
  var systemPair = history.slice(0, 2);
  var recent = history.slice(-(MAX_HISTORY_TURNS * 2));
  return systemPair.concat(recent);
}

function sanitizeForSpeech(text) {
  // Remove markdown, asterisks, brackets, etc. that break SSML
  return text
    .replace(/\*+/g, '')
    .replace(/#+/g, '')
    .replace(/\[|\]/g, '')
    .replace(/\(http[^)]*\)/g, '')
    .replace(/[<>]/g, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000); // Alexa max speech
}

function callGemini(conversationHistory) {
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent" +
    "?key=" + encodeURIComponent(GEMINI_API_KEY);

  var body = {
    contents: conversationHistory,
    generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
  };

  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).then(function(resp) {
    if (!resp.ok) {
      return resp.text().then(function(errText) {
        throw new Error("Gemini HTTP " + resp.status + ": " + errText);
      });
    }
    return resp.json();
  }).then(function(data) {
    var candidates = data.candidates || [];
    var content = candidates[0] && candidates[0].content;
    var parts = content && content.parts;
    var text = parts ? parts.map(function(p) { return p.text; }).join("").trim() : "";
    return text || "I couldn't generate a response.";
  });
}

function getOrInitHistory(sessionAttributes) {
  if (sessionAttributes.conversationHistory && sessionAttributes.conversationHistory.length > 0) {
    return sessionAttributes.conversationHistory;
  }
  return [
    { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
    { role: "model", parts: [{ text: "Understood. I will keep my answers concise and voice-friendly. Ask me anything." }] }
  ];
}

function askGeminiAndRespond(handlerInput, userText) {
  var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var history = getOrInitHistory(sessionAttributes);

  history.push({ role: "user", parts: [{ text: userText }] });
  history = trimHistory(history);

  console.log("Calling Gemini with " + history.length + " messages");

  return callGemini(history)
    .then(function(answer) {
      var cleanAnswer = sanitizeForSpeech(answer);
      console.log("Gemini answered: " + cleanAnswer.slice(0, 100) + "...");

      history.push({ role: "model", parts: [{ text: answer }] });
      sessionAttributes.conversationHistory = trimHistory(history);
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

      return handlerInput.responseBuilder
        .speak(cleanAnswer)
        .reprompt("Anything else?")
        .getResponse();
    })
    .catch(function(e) {
      console.error("AskGemini error:", e.message || e);
      return handlerInput.responseBuilder
        .speak("Sorry, I had trouble getting an answer. Try again.")
        .reprompt("Ask me something else.")
        .getResponse();
    });
}

var LaunchRequestHandler = {
  canHandle: function(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle: function(handlerInput) {
    console.log("LaunchRequest");
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.conversationHistory = getOrInitHistory(sessionAttributes);
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak("The Oracle is ready. Ask me anything.")
      .reprompt("What would you like to know?")
      .getResponse();
  }
};

var AskGeminiIntentHandler = {
  canHandle: function(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskGeminiIntent';
  },
  handle: function(handlerInput) {
    var slots = handlerInput.requestEnvelope.request.intent.slots;
    var query = slots && slots.query && slots.query.value;
    console.log("AskGeminiIntent, query:", query);

    if (!query || !query.trim()) {
      return handlerInput.responseBuilder
        .speak("What would you like to ask?")
        .reprompt("Ask me anything.")
        .getResponse();
    }

    return askGeminiAndRespond(handlerInput, query.trim());
  }
};

// Handle "tell me more", "continue", "elaborate", etc.
var FollowUpIntentHandler = {
  canHandle: function(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'FollowUpIntent';
  },
  handle: function(handlerInput) {
    console.log("FollowUpIntent");
    return askGeminiAndRespond(handlerInput, "Please elaborate on your previous answer with more detail.");
  }
};

var HelpIntentHandler = {
  canHandle: function(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle: function(handlerInput) {
    return handlerInput.responseBuilder
      .speak("You can ask me anything. Say tell me about, or explain, followed by your question. I remember our conversation so you can say tell me more for follow-ups.")
      .reprompt("What would you like to ask?")
      .getResponse();
  }
};

var CancelAndStopIntentHandler = {
  canHandle: function(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle: function(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Goodbye!")
      .getResponse();
  }
};

var FallbackIntentHandler = {
  canHandle: function(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle: function(handlerInput) {
    console.log("FallbackIntent");
    return handlerInput.responseBuilder
      .speak("I didn't quite catch that. Try saying tell me about something, or explain something.")
      .reprompt("What would you like to ask?")
      .getResponse();
  }
};

var SessionEndedRequestHandler = {
  canHandle: function(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle: function(handlerInput) {
    console.log("Session ended");
    return handlerInput.responseBuilder.getResponse();
  }
};

var ErrorHandler = {
  canHandle: function() {
    return true;
  },
  handle: function(handlerInput, error) {
    console.error("Error:", error.message || JSON.stringify(error));
    return handlerInput.responseBuilder
      .speak("Sorry, something went wrong. Try again.")
      .reprompt("What would you like to ask?")
      .getResponse();
  }
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    AskGeminiIntentHandler,
    FollowUpIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();