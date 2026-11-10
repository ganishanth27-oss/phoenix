import { useState, useEffect, useRef } from "react";
import phoenixLogo from "../assets/phoenix-logo.png";
import "./PhoenixAIModal.css";

const QUICK_SUGGESTIONS = [
  "Tell me about Phoenix Solutions",
  "What services do you offer?",
  "Show me your projects",
  "How can I contact you?",
  "Ask a general question"
];

// Rich domain knowledge base for Phoenix AI assistant
const KNOWLEDGE_RESPONSES = {
  about: `**PHOENIX SOLUTIONS** is a premier digital technology & creative powerhouse operating under the motto **"Creating Beyond Limits"**.\n\nWe bridge advanced software engineering, cloud infrastructures, interactive 3D visualizations, and viral creative media into an integrated enterprise ecosystem. Our team delivers enterprise-grade software and creative assets across the globe.`,
  services: `Here are the core services we provide at **Phoenix Solutions**:\n\n1. **Web & Cloud Development** – Ultra-responsive web portals, SaaS platforms, high-throughput REST/GraphQL APIs, and Supabase cloud infrastructure.\n2. **Mobile App Engineering** – Cross-platform iOS and Android apps with real-time sync and native performance.\n3. **UI/UX Design Systems** – User journeys, wireframes, interactive high-fidelity Figma prototypes, and scalable design systems.\n4. **3D Design & Blueprints** – Precision 3D modeling, spatial rendering, architectural drafting, and MEP blueprints.\n5. **Video Editing & Motion** – Cinematic promotional cuts, 3D motion graphics, and narrative digital video.\n6. **Advertisement Creation** – Multi-platform ad campaigns, conversion-focused visual collateral, and brand identity design.\n7. **Viral Marketing & Memes** – High-velocity creative digital content engineered for rapid engagement and community building.`,
  projects: `Our team has delivered diverse enterprise and consumer products! Highlights include:\n\n• **Enterprise Financial Dashboard** – High-throughput analytics platform with real-time data streaming.\n• **Commercial Complex 3D Blueprint** – Architectural spatial rendering and MEP blueprints for an 80,000 sq ft smart retail facility.\n• **Next-Gen Telehealth Mobile App** – Patient-practitioner video consultation platform with encrypted medical records.\n\nYou can explore our featured deliverables in the **Projects** section on this page!`,
  contact: `You can connect with Phoenix Solutions instantly without needing an account:\n\n• **Inquiry Form**: Scroll down to the **Contact** section below to submit your requirements.\n• **Direct Email**: contact@phoenixsolutions.com\n• **Response Time**: Our dedicated Project Managers review all incoming inquiries within 24 hours.\n• **Confidentiality**: All schematics, blueprints, and ideas are strictly protected by mutual NDA assurance.`,
  general: `Phoenix AI is here to help! You can ask me about:\n\n• Project scoping and timelines\n• Our tech stack (React, Node.js, Supabase, 3D Web, Cloud)\n• Requesting a quote or custom proposal\n• Booking an architectural blueprint consultation\n\nHow can I help you today?`
};

function PhoenixAIModal({ isOpen, onClose, onNavigateSection }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "ai",
      text: "Greetings! I am Phoenix AI, your smart digital assistant for Phoenix Solutions. How can I assist you with our services, projects, or enterprise consultations today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    // Natural assistant intelligence simulation
    setTimeout(() => {
      const qLower = query.toLowerCase();
      let reply = "";

      if (qLower.includes("tell me about") || qLower.includes("who are you") || qLower.includes("about phoenix") || qLower.includes("company")) {
        reply = KNOWLEDGE_RESPONSES.about;
      } else if (qLower.includes("service") || qLower.includes("offer") || qLower.includes("web") || qLower.includes("app") || qLower.includes("3d") || qLower.includes("video")) {
        reply = KNOWLEDGE_RESPONSES.services;
      } else if (qLower.includes("project") || qLower.includes("portfolio") || qLower.includes("work") || qLower.includes("case study")) {
        reply = KNOWLEDGE_RESPONSES.projects;
      } else if (qLower.includes("contact") || qLower.includes("reach") || qLower.includes("email") || qLower.includes("phone") || qLower.includes("quote") || qLower.includes("hire")) {
        reply = KNOWLEDGE_RESPONSES.contact;
      } else if (qLower.includes("hello") || qLower.includes("hi") || qLower.includes("hey")) {
        reply = "Hello! Welcome to Phoenix Solutions. Whether you need full-stack engineering, a 3D blueprint, or viral marketing campaigns, I can guide you to the right team.";
      } else if (qLower.includes("admin") || qLower.includes("manager") || qLower.includes("login")) {
        reply = "Authorized personnel (Admins & Managers) can access secure portals using the dedicated login options in the top navigation bar.";
      } else {
        reply = `Thank you for your question regarding "${query}".\n\nPhoenix Solutions specializes in custom digital transformations, from software engineering to 3D visualization. Our project managers can tailor an exact solution for your specific requirements. Feel free to submit an inquiry through our Contact section for a rapid response within 24 hours!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      setIsTyping(false);
    }, 650);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "ai",
        text: "Chat cleared. What can Phoenix AI assist you with next?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="phoenix-ai-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Phoenix AI Assistant">
      <div className="phoenix-ai-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="phoenix-ai-header">
          <div className="ai-header-brand">
            <div className="ai-logo-container">
              <img src={phoenixLogo} alt="Phoenix AI Logo" className="ai-logo-img" />
              <span className="ai-status-dot" title="Online & Ready" />
            </div>
            <div className="ai-brand-details">
              <div className="ai-brand-name">
                <span>PHOENIX AI</span>
                <span className="ai-badge-pro">ASSISTANT</span>
              </div>
              <span className="ai-tagline">Creating Beyond Limits • 24/7 Digital Concierge</span>
            </div>
          </div>

          <div className="ai-header-controls">
            <button
              className="ai-ctrl-btn"
              onClick={handleClearChat}
              title="Clear Conversation"
              aria-label="Clear chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
            <button
              className="ai-ctrl-btn close-btn"
              onClick={onClose}
              title="Close Phoenix AI"
              aria-label="Close assistant"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="ai-chips-bar" aria-label="Quick questions">
          {QUICK_SUGGESTIONS.map((chip, idx) => (
            <button
              key={idx}
              className="ai-chip-pill"
              onClick={() => handleSend(chip)}
            >
              <span className="ai-chip-sparkle">✦</span>
              <span>{chip}</span>
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div className="phoenix-ai-body">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`ai-message-row ${msg.sender === "user" ? "user-row" : "ai-row"}`}
            >
              {msg.sender === "ai" && (
                <div className="ai-avatar-wrap">
                  <img src={phoenixLogo} alt="AI" className="ai-avatar-img" />
                </div>
              )}
              <div className={`ai-bubble ${msg.sender === "user" ? "user-bubble" : "ai-bubble-content"}`}>
                <div className="ai-bubble-text">
                  {msg.text.split("\n").map((line, lIdx) => {
                    if (!line.trim()) return <br key={lIdx} />;
                    // Basic bold parsing
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={lIdx}>
                        {parts.map((part, pIdx) => {
                          if (part.startsWith("**") && part.endsWith("**")) {
                            return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    );
                  })}
                </div>
                <span className="ai-timestamp">{msg.timestamp}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="ai-message-row ai-row">
              <div className="ai-avatar-wrap">
                <img src={phoenixLogo} alt="AI" className="ai-avatar-img" />
              </div>
              <div className="ai-bubble ai-bubble-content typing-bubble">
                <div className="ai-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="ai-typing-text">Phoenix AI is formulating an answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input */}
        <div className="phoenix-ai-footer">
          <div className="ai-input-wrap">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Phoenix AI anything (e.g. services, blueprints, quote)..."
              aria-label="Message Phoenix AI"
            />
            <button
              className="ai-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <div className="ai-footer-note">
            <span>Powered by Phoenix Solutions Intelligence • Press Enter to Send</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhoenixAIModal;

