const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Get OpenRouter API key - can be set via localStorage for testing
function getApiKey() {
  return localStorage.getItem('openrouter-api-key') || import.meta.env.VITE_OPENROUTER_API_KEY
}

// Mock mode for testing without hitting API
// Can be toggled via localStorage key 'openrouter-mock' (true/false)
const MOCK_MODE = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('openrouter-mock')
    if (stored !== null) return stored === 'true'
  }
  return false // Default to REAL API now
}

function makeMockResponse(quadrantId) {
  const mock = {
    problem: {
      core: "Unclear problem definition",
      top: ["System-level ambiguity"],
      bottom: ["Missing success criteria"],
      sides: ["Domain-specific framing"]
    },
    fit: {
      core: "Solution addresses symptoms not root cause",
      top: ["Misaligned system boundaries"],
      bottom: ["Implementation detail gaps"],
      sides: ["Alternative approach viability"]
    },
    blindspots: {
      core: "Second-order effects not considered",
      top: ["Systemic feedback loops"],
      bottom: ["Edge case failures"],
      sides: ["Regulatory/compliance risks"]
    },
    alternatives: {
      core: "Simpler solution exists with fewer assumptions",
      top: ["Completely different paradigm"],
      bottom: ["Direct brute-force approach"],
      sides: ["Cross-domain analogy"]
    }
  }
  return JSON.stringify(mock[quadrantId] || mock.problem)
}

export async function callClaude({ system, userContent, maxTokens = 1200, signal, quadrantId }) {
  // Mock mode for frontend testing
  if (MOCK_MODE()) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500))
    // Use provided quadrant ID, or fallback to parsing from system prompt
    const qId = quadrantId || 'problem'
    return makeMockResponse(qId)
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('OpenRouter API key required. Set localStorage key "openrouter-api-key" or VITE_OPENROUTER_API_KEY env var.')
  }

  console.log(`[API] Calling for quadrant ${quadrantId}, maxTokens=${maxTokens}`)

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
      },
      body: JSON.stringify({
        model: 'stepfun/step-3.5-flash:free',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userContent }],
      }),
      signal,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const message = err?.error?.message || err?.message || `HTTP ${res.status}`
      throw new Error(message)
    }

    const data = await res.json()

    // Handle OpenRouter response format
    if (data.choices && Array.isArray(data.choices) && data.choices[0]) {
      const msg = data.choices[0].message
      let rawText = null

      // Standard: content is a string
      if (msg && typeof msg.content === 'string' && msg.content.length > 0) {
        rawText = msg.content
      }
      // Thinking models: content is null, actual output in reasoning field
      if (msg && msg.content === null && typeof msg.reasoning === 'string' && msg.reasoning.length > 0) {
        rawText = msg.reasoning
      }

      if (rawText) {
        // Debug: log snippet
        console.log(`[API] Got response for ${quadrantId}, length: ${rawText.length}, snippet: ${rawText.slice(0, 300)}...`)

        // For thinking models: extract the last JSON object from the reasoning
        // The model typically explains then outputs JSON at the end
        const jsonMatches = rawText.match(/\{(?:[^{}]|[\s\S])*?\}/g) // Find all objects
        if (jsonMatches && jsonMatches.length > 0) {
          console.log(`[API] Found ${jsonMatches.length} JSON candidates`)
          // Try each match from last to first, return first that parses
          for (let i = jsonMatches.length - 1; i >= 0; i--) {
            try {
              const parsed = JSON.parse(jsonMatches[i])
              console.log(`[API] Parsed candidate ${i}:`, JSON.stringify(parsed).slice(0, 100))
              // Validate structure
              if (parsed && (parsed.core !== undefined || Array.isArray(parsed.top) || Array.isArray(parsed.bottom) || Array.isArray(parsed.sides))) {
                return jsonMatches[i]
              }
            } catch (e) {
              console.log(`[API] Candidate ${i} failed parse:`, e.message)
              continue
            }
          }
        } else {
          console.log(`[API] No JSON matches found in response`)
        }
        // If no JSON found, return raw text and let parser handle it
        return rawText
      }
    }

    // Fallback: try to extract any content
    throw new Error('Unexpected response format from OpenRouter')
  } catch (e) {
    if (e.name === 'AbortError') throw e
    // Provide helpful guidance
    if (e.message.includes('null content') || e.message.includes('Unexpected response')) {
      throw new Error(`${e.message}. Try: 1) Check your API key, 2) Free models may be rate-limited, 3) Enable MOCK_MODE in api.js for testing.`)
    }
    throw e
  }
}
