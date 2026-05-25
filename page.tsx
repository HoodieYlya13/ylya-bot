"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSafeBack } from "@/components/layout/NavigationProvider";
import {
  Bot,
  User,
  Send,
  ArrowLeft,
  Terminal,
  Sparkles,
  Cpu,
} from "lucide-react";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  isStreaming?: boolean;
}

const PRESET_QUESTIONS = [
  {
    label: "💼 Tell me about Ylya's work at Equasens",
    query: "Tell me about Ylya's work at Equasens",
    colorClass:
      "hover:border-apple-blue/50 hover:text-apple-blue hover:bg-apple-blue/5",
    response: `**Ylya Martchenko** has been serving as a **Full Stack Developer** at **Equasens** since September 2023 (through September 2026). 

His primary contributions and engineering achievements at Equasens include:
* **Front-End Architecture:** Scaling scalable frontend interfaces using **Angular**, while successfully introducing and advocating for modern, modular **React** patterns.
* **Back-End Microservices:** Designing, building, and maintaining robust backend systems utilizing **Spring Boot** (Java 21) within a distributed microservices framework.
* **Automated Data Pipelines:** Engineering and scheduling automated **CRON jobs** for complex background data operations, system health-checks, and asynchronous enterprise workflows.
* **API Optimization:** Designing highly performant and typesafe **REST APIs** to guarantee low-latency communication across system boundaries.`,
  },
  {
    label: "⚡ What is his core technology stack?",
    query: "What is his core technology stack?",
    colorClass:
      "hover:border-apple-orange/50 hover:text-apple-orange hover:bg-apple-orange/5",
    response: `According to Ylya's centralized **SSoT skills matrix**, his technical ecosystem is highly polyglot and modern:

* **Primary Web Stack:** Next.js 16, React 19, Angular, TypeScript, JavaScript
* **Backend & Data Engine:** Spring Boot (Java), Node.js, PostgreSQL, MySQL, REST APIs, GraphQL
* **Polyglot Programming:** Python, Rust, Java, C, C++, C#
* **DevOps & Infrastructure:** Docker, Bash scripting, Linux systems administration, macOS, Liquid templating
* **AI & Agentic Engineering:** AI/RAG Engineering pipelines, vector storage integration, and stateless prompt grounding
* **Ecosystem Tools:** Git, GitHub, GitLab CI/CD, Postman, Bruno, Insomnia`,
  },
  {
    label: "🏗️ How does the SSoT profile.json workflow operate?",
    query: "How does the SSoT profile.json workflow operate?",
    colorClass:
      "hover:border-apple-green/50 hover:text-apple-green hover:bg-apple-green/5",
    response: `Ylya's **Single Source of Truth (SSoT)** architecture is a state-of-the-art decoupled data system designed for absolute dry (Don't Repeat Yourself) consistency:

1. **Central Matrix (\`profile.json\`):** An exhaustive JSON file in the \`HoodieYlya13/HoodieYlya13\` repo that houses all timelines, bio, credentials, skill vectors, and pins.
2. **Automated CI/CD:** A programmatic Node.js GitHub Action on push compiles the profile data directly into the GitHub profile \`README.md\` and uses the **GitHub GraphQL API** to synchronize featured pins on his account overview page.
3. **Real-time Seeding:** His Next.js 16/React 19 portfolio app queries the raw GitHub raw JSON URL on demand using Server Components.
4. **Caching & Stream Performance:** It leverages standard caching (\`revalidate: 3600\`) and React 19 dynamic interleaving (\`<Suspense>\`) to stream pages with **Partial Prerendering (PPR)** for an instant First Contentful Paint.
5. **YlyaBot Grounding:** I am dynamically injected with this exact JSON schema as my primary grounding matrix, ensuring 100% factual accuracy and zero hallucination.`,
  },
  {
    label: "🎒 Tell me about his education and background",
    query: "Tell me about his education and background",
    colorClass:
      "hover:border-apple-yellow/50 hover:text-apple-yellow hover:bg-apple-yellow/5",
    response: `Ylya is pursuing advanced engineering credentials alongside strong community leadership milestones:

* **Engineering Degree (2023 - 2026):** Currently studying at **Polytech Nancy** in **IARN** (Informatics, Automatic, Robotics, and Networks), focusing on cyber-physical systems, hardware-software integration, and advanced networks.
* **Physics & Mathematics Foundations:** Holds a BTEC Higher National Diploma in **Physical Measurements** and a Diploma of Higher Education in **Engineering Sciences**, specializing in instrumentation, physical sensors, and math models.
* **Linguistic Versatility:** Fully trilingual—fluent in **French (C2 Native)**, **English (C1 Professional Fluent)**, and **Russian (C1 Mother tongue)**.
* **Civic Leadership:** Served as President of Junior Association 2PB, Metz Youth Council representative, and community project lead managing a €100,000 sports infrastructure project for Metz City Hall at age 14.`,
  },
];

async function readResponseStream(
  response: Response,
  onChunk: (accumulatedText: string, done: boolean) => void,
) {
  const reader = response.body?.getReader();
  if (!reader)
    throw new Error("No readable stream reader available on response");

  const decoder = new TextDecoder();
  let done = false;
  let accumulatedText = "";

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      const chunk = decoder.decode(value, { stream: !done });
      accumulatedText += chunk;
      onChunk(accumulatedText, done);
    }
  }
}

export default function YlyaBotPage() {
  const safeBack = useSafeBack();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I am **YlyaBot v1.5**, Ylya Martchenko's RAG-powered digital twin. My knowledge base is fully grounded in Ylya's centralized SSoT `profile.json` and cross-repo codebase vectors. Ask me anything about his technical expertise, projects, or background!",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef(0);

  const scrollToBottom = () => {
    const isIframe =
      typeof window !== "undefined" && window.self !== window.top;

    if (isIframe && chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    } else messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    messageIdCounter.current += 1;
    const userMsgId = `user-${messageIdCounter.current}`;

    const updatedMessages = [
      ...messages,
      { id: userMsgId, sender: "user" as const, text: textToSend },
    ];
    setMessages(updatedMessages);
    setInputVal("");
    setIsTyping(true);

    try {
      const apiMessages = updatedMessages
        .filter((m) => m.id !== "welcome" && !m.id.startsWith("bot-err"))
        .map((m) => ({
          role:
            m.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: m.text,
        }));

      const response = await fetch("/ylya-bot/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok)
        throw new Error(`HTTP network error: status ${response.status}`);

      setIsTyping(false);

      messageIdCounter.current += 1;
      const newBotMessageId = `bot-${messageIdCounter.current}`;

      setMessages((prev) => [
        ...prev,
        { id: newBotMessageId, sender: "bot", text: "", isStreaming: true },
      ]);

      await readResponseStream(response, (accumulatedText, isStreamDone) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newBotMessageId
              ? { ...msg, text: accumulatedText, isStreaming: !isStreamDone }
              : msg,
          ),
        );
      });
    } catch (error) {
      console.error("🔴 Connection to YlyaBot Intelligence failed:", error);
      setIsTyping(false);

      messageIdCounter.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${messageIdCounter.current}`,
          sender: "bot",
          text: "⚠️ I'm sorry, I'm having trouble connecting to my central matrix intelligence channel right now. Please try again, or reach out directly to Ylya at ylyamartchenko@gmail.com.",
        },
      ]);
    }
  };

  const renderMessageText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      let content: React.ReactNode = line;

      const isBullet =
        line.trim().startsWith("* ") || line.trim().startsWith("- ");
      if (isBullet) {
        const bulletText = line.trim().substring(2);
        content = renderBoldText(bulletText);
        return (
          <li
            key={idx}
            className="ml-4 list-disc text-sm md:text-base leading-relaxed text-foreground mb-1"
          >
            {content}
          </li>
        );
      }

      content = renderBoldText(line);
      return (
        <p
          key={idx}
          className="text-sm md:text-base leading-relaxed text-foreground mb-2 min-h-4"
        >
          {content}
        </p>
      );
    });
  };

  const renderBoldText = (lineText: string) => {
    let cursor = 0;
    const elements: React.ReactNode[] = [];

    while (cursor < lineText.length) {
      const boldIdx = lineText.indexOf("**", cursor);
      const codeIdx = lineText.indexOf("`", cursor);

      let nextSpecialIdx = -1;
      let type: "bold" | "code" | "text" = "text";

      if (boldIdx !== -1 && (codeIdx === -1 || boldIdx < codeIdx)) {
        nextSpecialIdx = boldIdx;
        type = "bold";
      } else if (codeIdx !== -1) {
        nextSpecialIdx = codeIdx;
        type = "code";
      }

      if (nextSpecialIdx === -1) {
        elements.push(<span key={cursor}>{lineText.substring(cursor)}</span>);
        break;
      }

      if (nextSpecialIdx > cursor)
        elements.push(
          <span key={cursor}>
            {lineText.substring(cursor, nextSpecialIdx)}
          </span>,
        );

      if (type === "bold") {
        const endBoldIdx = lineText.indexOf("**", nextSpecialIdx + 2);
        if (endBoldIdx !== -1) {
          elements.push(
            <strong
              key={nextSpecialIdx}
              className="font-semibold text-apple-orange"
            >
              {lineText.substring(nextSpecialIdx + 2, endBoldIdx)}
            </strong>,
          );
          cursor = endBoldIdx + 2;
        } else {
          elements.push(<span key={nextSpecialIdx}>**</span>);
          cursor = nextSpecialIdx + 2;
        }
      } else {
        const endCodeIdx = lineText.indexOf("`", nextSpecialIdx + 1);
        if (endCodeIdx !== -1) {
          elements.push(
            <code
              key={nextSpecialIdx}
              className="px-1.5 py-0.5 rounded bg-muted/95 border border-border text-apple-blue font-mono text-xs md:text-sm"
            >
              {lineText.substring(nextSpecialIdx + 1, endCodeIdx)}
            </code>,
          );
          cursor = endCodeIdx + 1;
        } else {
          elements.push(<span key={nextSpecialIdx}>`</span>);
          cursor = nextSpecialIdx + 1;
        }
      }
    }

    return elements;
  };

  return (
    <section className="relative h-screen h-dvh flex flex-col items-center p-3 sm:p-4 md:p-6 overflow-hidden bg-background z-10">
      <div className="absolute top-20 left-10 text-apple-yellow/10 animate-pulse pointer-events-none">
        <Sparkles className="size-24" />
      </div>
      <div className="absolute bottom-20 right-10 text-apple-blue/5 animate-bounce duration-1000 pointer-events-none">
        <Cpu className="size-32" />
      </div>

      <div className="w-full max-w-4xl z-10 flex flex-col flex-1 gap-3 md:gap-4 overflow-hidden animate-fade-in h-full">
        <div className="flex justify-between items-center gap-3 bg-card/30 backdrop-blur-xl border border-border/60 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-2xl shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                safeBack();
              }}
              className="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent"
              aria-label="Go back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="size-10 bg-linear-to-tr from-apple-orange to-apple-yellow rounded-xl flex items-center justify-center shadow-lg shadow-apple-orange/20">
                  <Bot className="size-6 text-background dark:text-foreground" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-apple-green rounded-full border-2 border-background animate-pulse" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  YlyaBot
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-apple-blue/10 text-apple-blue border border-apple-blue/20">
                    v1.5
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground">
                  Stateless Context Engine Active
                </p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/50 border border-border text-xs font-mono text-muted-foreground">
            <Terminal className="size-3.5 text-apple-green" />
            <span>sys_context: profile.json</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium px-1 flex items-center gap-1">
            <Sparkles className="size-3 text-apple-orange" /> Grounded Context
            Chips (Click to ask):
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {PRESET_QUESTIONS.map((pq, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(pq.query)}
                className={`text-left p-2 md:p-3 rounded-lg md:rounded-xl border border-border/80 text-[10px] sm:text-xs text-foreground transition-all duration-200 shadow-sm backdrop-blur-sm cursor-pointer hover:translate-y-px ${pq.colorClass}`}
              >
                {pq.label}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto rounded-xl md:rounded-2xl bg-card/20 border border-border/50 backdrop-blur-xl p-3 md:p-6 shadow-inner flex flex-col gap-3 md:gap-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${
                msg.sender === "user"
                  ? "self-end flex-row-reverse"
                  : "self-start"
              }`}
            >
              <div
                className={`size-8 rounded-lg flex items-center justify-center shadow-md shrink-0 ${
                  msg.sender === "user"
                    ? "bg-secondary border border-border text-secondary-foreground"
                    : "bg-linear-to-br from-apple-orange to-apple-yellow text-background dark:text-foreground"
                }`}
              >
                {msg.sender === "user" ? (
                  <User className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
              </div>

              <div
                className={`p-2.5 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl shadow-xl border ${
                  msg.sender === "user"
                    ? "bg-muted/95 border-border rounded-tr-none text-foreground"
                    : "bg-card/75 border-border/50 rounded-tl-none text-foreground"
                }`}
              >
                <div className="flex flex-col gap-0.5 animate-fade-in">
                  {renderMessageText(msg.text)}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-apple-orange animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 max-w-[80%] self-start">
              <div className="size-8 rounded-lg bg-linear-to-br from-apple-orange to-apple-yellow text-background dark:text-foreground flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="size-4 animate-spin duration-3000" />
              </div>
              <div className="p-4 rounded-2xl rounded-tl-none bg-card/45 border border-border text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-apple-orange animate-bounce [animation-delay:-0.3s]" />
                <span className="size-2 rounded-full bg-apple-orange animate-bounce [animation-delay:-0.15s]" />
                <span className="size-2 rounded-full bg-apple-orange animate-bounce" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputVal);
          }}
          className="flex gap-2 shrink-0 pb-1"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask YlyaBot anything..."
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl bg-card/40 border border-border hover:border-border/80 focus:border-apple-orange/50 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-apple-orange/20 transition-all duration-200 backdrop-blur-md shadow-lg"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="px-5 bg-apple-orange hover:bg-apple-orange/90 disabled:opacity-40 disabled:pointer-events-none text-background dark:text-foreground rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg shadow-apple-orange/10 cursor-pointer border-none"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
