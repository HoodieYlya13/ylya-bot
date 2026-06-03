"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSafeBack } from "@/components/layout/NavigationProvider";
import {
  Bot,
  ArrowLeft,
  Terminal,
  Sparkles,
  Briefcase,
  Code,
  Workflow,
  GraduationCap,
  ArrowUp,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { readStreamableValue } from "@ai-sdk/rsc";
import { askYlyaBot } from "./actions";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  isStreaming?: boolean;
}

const PRESET_TOPICS = [
  {
    icon: Briefcase,
    title: "Equasens & Enterprise Dev",
    subtext: "Angular, Spring Boot microservices, and CRON workflows.",
    query: "Tell me about Ylya's work at Equasens",
    colorClass:
      "border-apple-blue/20 hover:border-apple-blue/50 hover:bg-apple-blue/5",
    iconColor: "text-apple-blue",
    glowColor: "rgba(0,122,255,0.06)",
  },
  {
    icon: Code,
    title: "Full Stack Tech Ecosystem",
    subtext: "Next.js 16, React 19, TypeScript, Rust, and Databases.",
    query: "What is his core technology stack?",
    colorClass:
      "border-apple-orange/20 hover:border-apple-orange/50 hover:bg-apple-orange/5",
    iconColor: "text-apple-orange",
    glowColor: "rgba(255,149,0,0.06)",
  },
  {
    icon: Workflow,
    title: "Central SSoT Sync Engine",
    subtext: "CI/CD Action compiling profile.json dynamically.",
    query: "How does the SSoT profile.json workflow operate?",
    colorClass:
      "border-apple-green/20 hover:border-apple-green/50 hover:bg-apple-green/5",
    iconColor: "text-apple-green",
    glowColor: "rgba(52,199,89,0.06)",
  },
  {
    icon: GraduationCap,
    title: "Education & Leadership",
    subtext: "Polytech Nancy engineering, tri-lingual, civic accomplishments.",
    query: "Tell me about his education and background",
    colorClass:
      "border-apple-yellow/20 hover:border-apple-yellow/50 hover:bg-apple-yellow/5",
    iconColor: "text-apple-yellow",
    glowColor: "rgba(255,204,0,0.06)",
  },
];

export default function YlyaBotPage() {
  const safeBack = useSafeBack();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I am **YlyaBot v2.0**, Ylya Martchenko's RAG-powered digital twin. My knowledge base is fully grounded in Ylya's centralized SSoT `profile.json` and cross-repo codebase vectors. Ask me anything about his technical expertise, projects, or background!",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef(0);

  const scrollToBottom = () => {
    if (chatContainerRef.current)
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    setHasStartedChat(true);
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

      const { output } = await askYlyaBot({ messages: apiMessages });
      setIsTyping(false);

      messageIdCounter.current += 1;
      const newBotMessageId = `bot-${messageIdCounter.current}`;

      setMessages((prev) => [
        ...prev,
        { id: newBotMessageId, sender: "bot", text: "", isStreaming: true },
      ]);
      let currentText = "";
      let lastUpdateTime = getImpureTimestamp();

      for await (const delta of readStreamableValue(output)) {
        if (delta !== undefined) {
          currentText += delta;
          const now = getImpureTimestamp();
          if (now - lastUpdateTime > 60) {
            const textToSet = currentText;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === newBotMessageId ? { ...msg, text: textToSet } : msg,
              ),
            );
            lastUpdateTime = now;
          }
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newBotMessageId
            ? { ...msg, text: currentText, isStreaming: false }
            : msg,
        ),
      );
    } catch (error) {
      console.error("🔴 Connection to YlyaBot Intelligence failed:", error);
      setIsTyping(false);

      messageIdCounter.current += 1;

      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => !m.isStreaming || m.text.trim() !== "",
        );
        return [
          ...filtered,
          {
            id: `bot-err-${messageIdCounter.current}`,
            sender: "bot",
            text: "⚠️ I'm sorry, I'm having trouble connecting to my central matrix intelligence channel right now. Please try again, or reach out directly to Ylya at ylyamartchenko@gmail.com.",
          },
        ];
      });
    }
  };

  return (
    <section className="relative h-screen h-svh w-full flex flex-col bg-background overflow-hidden z-10 font-sans">
      <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[50%] rounded-full bg-apple-orange/8 dark:bg-apple-orange/5 blur-[120px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[50%] rounded-full bg-apple-blue/6 dark:bg-apple-blue/4 blur-[130px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute top-[25%] right-[10%] w-[35%] h-[35%] rounded-full bg-apple-yellow/4 dark:bg-apple-yellow/2 blur-[100px] pointer-events-none" />

      <header className="w-full border-b border-border/40 shrink-0 bg-background/50 backdrop-blur-md z-10">
        <div className="max-w-3xl mx-auto w-full flex justify-between items-center py-4 px-4 md:px-0">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                safeBack();
              }}
              className="p-1.5 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent"
              aria-label="Go back"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-apple-green animate-pulse shadow-[0_0_8px_rgba(52,199,89,0.5)]" />
              <div>
                <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  YlyaBot
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-md bg-apple-orange/10 text-apple-orange border border-apple-orange/20">
                    v2.0
                  </span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 border border-border/40 text-[10px] font-mono text-muted-foreground select-none">
            <Terminal className="size-3 text-apple-green" />
            <span>SSoT Linked</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col w-full z-10">
        <div className="max-w-3xl mx-auto w-full flex-1 overflow-hidden relative flex flex-col">
          {!hasStartedChat ? (
            <div className="flex-1 overflow-y-auto flex flex-col justify-center py-4 md:py-8 gap-6 md:gap-10 scrollbar-none animate-fade-in">
              <div className="flex flex-col items-center text-center gap-3 md:gap-4 max-w-xl mx-auto px-4 mt-2 md:mt-0">
                <div className="relative flex items-center justify-center size-16 md:size-20">
                  <div className="absolute inset-0 bg-linear-to-tr from-apple-orange to-apple-yellow rounded-2xl blur-md opacity-35 animate-pulse" />
                  <div className="relative size-12 md:size-16 bg-linear-to-tr from-apple-orange to-apple-yellow rounded-2xl flex items-center justify-center shadow-lg">
                    <Bot className="size-7 md:size-9 text-white dark:text-foreground" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-foreground">
                    Ylya&apos;s Digital Twin
                  </h2>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-1.5 max-w-sm mx-auto">
                    Grounded in a verified Skills Matrix and multi-repository
                    codebase retrieval models.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 px-4">
                  <Sparkles className="size-3 text-apple-orange" /> Suggested
                  Focus Areas
                </p>

                <div className="hidden sm:grid grid-cols-2 gap-3 max-w-2xl mx-auto w-full px-4 md:px-0 right-2">
                  {PRESET_TOPICS.map((topic, idx) => {
                    const IconComp = topic.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(topic.query)}
                        style={{
                          boxShadow: `hover: 0 10px 30px ${topic.glowColor}`,
                        }}
                        className={`group text-left p-4 rounded-2xl border bg-card/35 backdrop-blur-md transition-all duration-300 cursor-pointer flex flex-col justify-between h-[110px] ${topic.colorClass}`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div
                            className={`p-1.5 rounded-lg bg-muted/60 ${topic.iconColor}`}
                          >
                            <IconComp className="size-4" />
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-foreground/70 transition-colors duration-300" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-foreground group-hover:text-apple-orange transition-colors">
                            {topic.title}
                          </h3>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {topic.subtext}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex sm:hidden overflow-x-auto gap-3 px-4 pb-3 scrollbar-none snap-x snap-mandatory scroll-px-4 w-full max-w-full">
                  {PRESET_TOPICS.map((topic, idx) => {
                    const IconComp = topic.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(topic.query)}
                        className={`snap-start shrink-0 text-left p-3.5 rounded-2xl border bg-card/35 backdrop-blur-md transition-all duration-300 cursor-pointer flex flex-col justify-between w-[250px] h-[95px] ${topic.colorClass}`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div
                            className={`p-1 rounded-lg bg-muted/60 ${topic.iconColor}`}
                          >
                            <IconComp className="size-3.5" />
                          </div>
                          <ChevronRight className="size-3.5 text-muted-foreground/30" />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-semibold text-foreground">
                            {topic.title}
                          </h3>
                          <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">
                            {topic.subtext}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto py-6 px-4 md:px-0 flex flex-col gap-6 scrollbar-none"
            >
              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex w-full gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="size-8 rounded-lg bg-linear-to-br from-apple-orange to-apple-yellow text-white dark:text-foreground flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                        <Bot className="size-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] ${
                        isUser
                          ? "p-3.5 rounded-2xl rounded-tr-xs bg-linear-to-tr from-apple-orange/15 to-apple-orange/5 border border-apple-orange/20 text-foreground shadow-xs text-sm md:text-base leading-relaxed"
                          : "flex flex-col gap-0.5 text-foreground leading-relaxed pl-1"
                      }`}
                    >
                      {isUser ? (
                        <p className="font-normal">{msg.text}</p>
                      ) : (
                        <div className="flex flex-col animate-fade-in font-normal">
                          {renderMessageText(msg.text)}
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-4 bg-apple-orange animate-pulse ml-0.5 align-middle" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-4 items-start w-full">
                  <div className="size-8 rounded-lg bg-linear-to-br from-apple-orange to-apple-yellow text-white dark:text-foreground flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                    <Bot className="size-4" />
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-xs bg-muted/40 border border-border/40 text-muted-foreground flex items-center gap-1.5 shadow-xs">
                    <span className="size-1.5 rounded-full bg-apple-orange animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-1.5 rounded-full bg-apple-orange animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-1.5 rounded-full bg-apple-orange animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <div className="w-full border-t border-border/40 shrink-0 bg-background/50 backdrop-blur-md py-4 z-10">
        <div className="max-w-3xl mx-auto w-full px-4 md:px-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputVal);
            }}
            className="relative flex items-center w-full"
          >
            <div className="absolute left-4 text-muted-foreground/60">
              <Sparkles className="size-4 text-apple-orange" />
            </div>

            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask about Equasens milestones, Skills matrix, SSoT pipelines..."
              className="w-full pl-11 pr-14 py-3.5 rounded-2xl bg-card/45 backdrop-blur-xl border border-border/70 hover:border-border focus:border-apple-orange/50 text-foreground placeholder-muted-foreground text-[1rem] md:text-sm focus:outline-none focus:ring-2 focus:ring-apple-orange/10 transition-all duration-300 shadow-sm"
            />

            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="absolute right-2 px-3 py-2 bg-apple-orange hover:bg-apple-orange/95 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border-none shadow-sm shadow-apple-orange/20"
            >
              <ArrowUp className="size-4" strokeWidth={2.5} />
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[9px] sm:text-xs text-muted-foreground/80 font-mono">
            <div className="size-1.5 rounded-full bg-apple-green animate-pulse" />
            <span>
              Grounded via Supabase Vector Index & Centralized profile.json
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const renderBoldText = (lineText: string): React.ReactNode[] => {
  let cursor = 0;
  const elements: React.ReactNode[] = [];

  const parseLink = (text: string, startIdx: number) => {
    const endLabelIdx = text.indexOf("]", startIdx + 1);
    if (endLabelIdx === -1) return null;

    let parenStartIdx = endLabelIdx + 1;
    while (parenStartIdx < text.length && text[parenStartIdx] === " ")
      parenStartIdx++;

    if (text[parenStartIdx] === "(") {
      const endUrlIdx = text.indexOf(")", parenStartIdx + 1);
      if (endUrlIdx !== -1) {
        let url = text.substring(parenStartIdx + 1, endUrlIdx).trim();
        if (
          (url.startsWith("'") && url.endsWith("'")) ||
          (url.startsWith('"') && url.endsWith('"'))
        )
          url = url.substring(1, url.length - 1);

        return {
          label: text.substring(startIdx + 1, endLabelIdx),
          url,
          endIdx: endUrlIdx + 1,
        };
      }
    }
    return null;
  };

  while (cursor < lineText.length) {
    const boldIdx = lineText.indexOf("**", cursor);
    const codeIdx = lineText.indexOf("`", cursor);

    let italicIdx = -1;
    let startSearch = cursor;
    while (true) {
      const found = lineText.indexOf("*", startSearch);
      if (found === -1) break;
      const isBoldLeft = found > 0 && lineText[found - 1] === "*";
      const isBoldRight =
        found + 1 < lineText.length && lineText[found + 1] === "*";
      if (!isBoldLeft && !isBoldRight) {
        italicIdx = found;
        break;
      }
      startSearch = found + (isBoldRight ? 2 : 1);
    }

    let nextLinkIdx = -1;
    let linkDetails: { label: string; url: string; endIdx: number } | null =
      null;

    let currentLinkIdx = cursor;
    while (true) {
      const foundLinkIdx = lineText.indexOf("[", currentLinkIdx);
      if (foundLinkIdx === -1) break;
      const details = parseLink(lineText, foundLinkIdx);
      if (details) {
        linkDetails = details;
        nextLinkIdx = foundLinkIdx;
        break;
      }
      currentLinkIdx = foundLinkIdx + 1;
    }

    let winIdx = -1;
    let winType: "bold" | "italic" | "code" | "link" | "text" = "text";

    if (boldIdx !== -1) {
      winIdx = boldIdx;
      winType = "bold";
    }
    if (italicIdx !== -1 && (winIdx === -1 || italicIdx < winIdx)) {
      winIdx = italicIdx;
      winType = "italic";
    }
    if (codeIdx !== -1 && (winIdx === -1 || codeIdx < winIdx)) {
      winIdx = codeIdx;
      winType = "code";
    }
    if (nextLinkIdx !== -1 && (winIdx === -1 || nextLinkIdx < winIdx)) {
      winIdx = nextLinkIdx;
      winType = "link";
    }

    if (winIdx === -1) {
      elements.push(<span key={cursor}>{lineText.substring(cursor)}</span>);
      break;
    }

    if (winIdx > cursor) {
      elements.push(
        <span key={cursor}>{lineText.substring(cursor, winIdx)}</span>,
      );
    }

    if (winType === "bold") {
      const endBoldIdx = lineText.indexOf("**", winIdx + 2);
      if (endBoldIdx !== -1) {
        elements.push(
          <strong key={winIdx} className="font-semibold text-apple-orange">
            {renderBoldText(lineText.substring(winIdx + 2, endBoldIdx))}
          </strong>,
        );
        cursor = endBoldIdx + 2;
      } else {
        elements.push(<span key={winIdx}>**</span>);
        cursor = winIdx + 2;
      }
    } else if (winType === "italic") {
      let endItalicIdx = -1;
      let startSearchEnd = winIdx + 1;
      while (true) {
        const found = lineText.indexOf("*", startSearchEnd);
        if (found === -1) break;
        const isBoldLeft = found > 0 && lineText[found - 1] === "*";
        const isBoldRight =
          found + 1 < lineText.length && lineText[found + 1] === "*";
        if (!isBoldLeft && !isBoldRight) {
          endItalicIdx = found;
          break;
        }
        startSearchEnd = found + (isBoldRight ? 2 : 1);
      }

      if (endItalicIdx !== -1) {
        elements.push(
          <em key={winIdx} className="italic text-foreground/90">
            {renderBoldText(lineText.substring(winIdx + 1, endItalicIdx))}
          </em>,
        );
        cursor = endItalicIdx + 1;
      } else {
        elements.push(<span key={winIdx}>*</span>);
        cursor = winIdx + 1;
      }
    } else if (winType === "code") {
      const endCodeIdx = lineText.indexOf("`", winIdx + 1);
      if (endCodeIdx !== -1) {
        elements.push(
          <code
            key={winIdx}
            className="px-1.5 py-0.5 rounded bg-muted/80 border border-border text-apple-blue font-mono text-xs md:text-sm"
          >
            {lineText.substring(winIdx + 1, endCodeIdx)}
          </code>,
        );
        cursor = endCodeIdx + 1;
      } else {
        elements.push(<span key={winIdx}>`</span>);
        cursor = winIdx + 1;
      }
    } else if (winType === "link" && linkDetails) {
      const { label, url, endIdx } = linkDetails;
      const isInternal = url.startsWith("/");
      if (isInternal)
        elements.push(
          <Link
            href={url}
            key={winIdx}
            className="underline text-apple-blue hover:text-apple-blue/80 transition-colors font-medium"
          >
            {label}
          </Link>,
        );
      else
        elements.push(
          <a
            href={url}
            key={winIdx}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-apple-blue hover:text-apple-blue/80 transition-colors font-medium inline-flex items-center gap-0.5"
          >
            {label}
            <ExternalLink className="size-3 inline" />
          </a>,
        );
      cursor = endIdx;
    } else cursor = winIdx + 1;
  }

  return elements;
};

const renderMessageText = (text: string) => {
  return text.split("\n").map((line, idx) => {
    const trimmed = line.trim();

    if (trimmed === "***" || trimmed === "---" || trimmed === "___")
      return <hr key={idx} className="my-5 border-t border-border/40 w-full" />;

    if (trimmed.startsWith("###### "))
      return (
        <h6 key={idx} className="text-xs font-bold text-foreground mt-4 mb-2">
          {renderBoldText(trimmed.substring(7))}
        </h6>
      );

    if (trimmed.startsWith("##### "))
      return (
        <h5 key={idx} className="text-xs font-bold text-foreground mt-4 mb-2">
          {renderBoldText(trimmed.substring(6))}
        </h5>
      );

    if (trimmed.startsWith("#### "))
      return (
        <h4
          key={idx}
          className="text-sm font-semibold text-foreground mt-4 mb-2"
        >
          {renderBoldText(trimmed.substring(5))}
        </h4>
      );

    if (trimmed.startsWith("### "))
      return (
        <h3 key={idx} className="text-base font-bold text-foreground mt-4 mb-2">
          {renderBoldText(trimmed.substring(4))}
        </h3>
      );

    if (trimmed.startsWith("## "))
      return (
        <h2
          key={idx}
          className="text-lg font-extrabold text-foreground mt-5 mb-2"
        >
          {renderBoldText(trimmed.substring(3))}
        </h2>
      );

    if (trimmed.startsWith("# "))
      return (
        <h1
          key={idx}
          className="text-xl font-extrabold text-foreground mt-6 mb-3"
        >
          {renderBoldText(trimmed.substring(2))}
        </h1>
      );

    const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
    if (isBullet) {
      const bulletText = trimmed.substring(2);
      const content = renderBoldText(bulletText);
      return (
        <li
          key={idx}
          className="ml-5 list-disc text-sm md:text-base leading-relaxed text-foreground/95 mb-1"
        >
          {content}
        </li>
      );
    }

    const content = renderBoldText(line);
    return (
      <p
        key={idx}
        className="text-sm md:text-base leading-relaxed text-foreground/95 mb-3 min-h-4 font-normal"
      >
        {content}
      </p>
    );
  });
};

function getImpureTimestamp(): number {
  return Date.now();
}
