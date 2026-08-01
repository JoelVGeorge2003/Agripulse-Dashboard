import { type FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Database, Send, Sparkles, UserRound } from "lucide-react";
import type { ChatResponse } from "@/types";
import { chatApi } from "@/services/chatApi";

interface ChatMessageView {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
}

interface ChatPanelProps {
  compact?: boolean;
  commoditySlug?: string;
  stateCode?: string;
  stateName?: string;
}

export function ChatPanel({ compact = false, commoditySlug, stateCode, stateName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageView[]>([
    { id: "welcome", role: "assistant", content: "Ask about prices, state production, crop rankings, units, and observation dates in the AgriPulse database." }
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const [modelStatus, setModelStatus] = useState<"checking" | "online" | "offline">("checking");
  const sequence = useRef(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetch("http://localhost:8000/health", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({ model_status: "offline" }))) as { model_status?: string };
        if (!active) return;
        setModelStatus(response.ok && payload.model_status === "online" ? "online" : "offline");
      })
      .catch(() => {
        if (active) setModelStatus("offline");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  async function submitMessage(message: string): Promise<void> {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;
    sequence.current += 1;
    setMessages((current) => [...current, { id: `user-${sequence.current}`, role: "user", content: trimmed }]);
    setInput("");
    setIsSending(true);
    try {
      const response = await chatApi.ask({ message: trimmed, commoditySlug, stateCode, sessionId });
      if (response.sessionId) setSessionId(response.sessionId);
      sequence.current += 1;
      setMessages((current) => [...current, { id: `assistant-${sequence.current}`, role: "assistant", content: response.answer, response }]);
    } catch (error: unknown) {
      sequence.current += 1;
      setMessages((current) => [...current, { id: `assistant-${sequence.current}`, role: "assistant", content: error instanceof Error ? error.message : "The analyst request failed." }]);
    } finally {
      setIsSending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submitMessage(input);
  }

  return (
    <article className={`chat-panel dashboard-panel ${compact ? "chat-panel-compact" : ""}`}>
      <header className="chat-header">
        <span className="chat-avatar"><Bot size={19} /></span>
        <div><p>AgriPulse AI analyst</p><small><Database size={12} /> Live model · USDA NASS grounded</small></div>
        <span className={`live-pill ${modelStatus === "offline" ? "offline" : ""}`}><span /> Model status: {modelStatus === "online" ? "online" : modelStatus === "offline" ? "offline" : "checking"}</span>
      </header>

      <div className="chat-messages" aria-live="polite">
        {messages.slice(compact ? -4 : -6).map((message) => (
          <div className={`chat-message ${message.role}`} key={message.id}>
            <span className="message-avatar">{message.role === "assistant" ? <Bot size={14} /> : <UserRound size={14} />}</span>
            <div>
              <p>{message.content}</p>
              {message.response && (
                <div className="chat-citations">
                  <span><Sparkles size={11} /> {message.response.generatedBy === "fallback" ? "Database fallback" : message.response.model}</span>
                  {message.response.evaluation && (
                    <span className={`confidence-score confidence-${message.response.evaluation.status}`}>
                      Confidence: {message.response.evaluation.confidenceScore}%
                    </span>
                  )}
                  {message.response.citations.slice(0, 2).map((citation) => <small key={`${citation.label}-${citation.value}`}><strong>{citation.label}:</strong> {citation.value}</small>)}
                </div>
              )}
            </div>
          </div>
        ))}
        {isSending && <div className="chat-message assistant"><span className="message-avatar"><Bot size={14} /></span><div className="typing-indicator"><span /><span /><span /></div></div>}
      </div>

      <form className="chat-composer" onSubmit={onSubmit}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={`Ask about ${stateName ?? "U.S. crop data"}…`} maxLength={2000} disabled={isSending} />
        <button type="submit" disabled={!input.trim() || isSending} aria-label="Send message"><Send size={17} /></button>
      </form>
    </article>
  );
}
