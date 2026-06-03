import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, MinusCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  conversationId: string;
  message: string;
  senderType: "visitor" | "admin" | "bot";
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  visitorId: string;
  messages: Message[];
}

const URL_REGEX = /(https?:\/\/[^\s)]+)/g;

function renderMessageWithLinks(text: string): React.ReactNode {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-600 dark:text-blue-400 break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function generateVisitorId(): string {
  let visitorId = localStorage.getItem("chat_visitor_id");
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("chat_visitor_id", visitorId);
  }
  return visitorId;
}

function getSavedChatInfo(): { name: string; email: string } | null {
  const saved = localStorage.getItem("chat_user_info");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const visitorId = generateVisitorId();

  const savedInfo = getSavedChatInfo();
  const [chatName, setChatName] = useState(savedInfo?.name || "");
  const [chatEmail, setChatEmail] = useState(savedInfo?.email || "");
  const [infoSubmitted, setInfoSubmitted] = useState(!!savedInfo);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && infoSubmitted && !conversation) {
      initConversation();
    }
    if (isOpen && conversation) {
      markAdminMessagesAsRead();
    }
  }, [isOpen, infoSubmitted, conversation]);

  const markAdminMessagesAsRead = async () => {
    if (!conversation) return;
    try {
      await apiRequest("POST", `/api/chat/mark-read/${conversation.id}`);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  useEffect(() => {
    if (!conversation) return;
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/chat/messages/${conversation.id}`);
        if (response.ok) {
          const newMessages = await response.json();
          setMessages(newMessages);
          
          const supportMessages = newMessages.filter((m: Message) => (m.senderType === "admin" || m.senderType === "bot") && !m.isRead);
          if (supportMessages.length > 0 && !isOpen) {
            setHasUnread(true);
          }
        }
      } catch (error) {
        console.error("Error polling messages:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversation, isOpen]);

  const initConversation = async () => {
    try {
      const response = await apiRequest("POST", "/api/chat/conversation", {
        visitorId,
        visitorName: chatName,
        visitorEmail: chatEmail,
      });
      const data = await response.json();
      setConversation(data);
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error initializing conversation:", error);
    }
  };

  const handleInfoSubmit = () => {
    if (!chatName.trim() || !chatEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(chatEmail.trim())) return;

    localStorage.setItem("chat_user_info", JSON.stringify({ name: chatName.trim(), email: chatEmail.trim() }));
    setInfoSubmitted(true);
  };

  const handleInfoKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInfoSubmit();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation || isLoading) return;

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/chat/message", {
        conversationId: conversation.id,
        message: newMessage.trim(),
        senderType: "visitor",
      });
      const sentMessage = await response.json();
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setHasUnread(false);
  };

  if (!isOpen) {
    return (
      <Button
        data-testid="button-chat-open"
        onClick={openChat}
        className="!fixed !bottom-6 !right-6 rounded-full shadow-lg z-[9999]"
        size="lg"
      >
        <MessageCircle className="h-6 w-6" />
        {hasUnread && (
          <span data-testid="indicator-unread" className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 animate-pulse" />
        )}
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Card className="!fixed !bottom-6 !right-6 w-72 shadow-lg z-[9999]">
        <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 px-4 cursor-pointer" onClick={() => setIsMinimized(false)}>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <CardTitle className="text-sm">Live Chat</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button
              data-testid="button-chat-expand"
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              data-testid="button-chat-close-minimized"
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="!fixed !bottom-6 !right-6 w-80 h-96 shadow-lg z-[9999] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 px-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <CardTitle className="text-sm">Live Chat Support</CardTitle>
        </div>
        <div className="flex gap-1">
          <Button
            data-testid="button-chat-minimize"
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(true)}
          >
            <MinusCircle className="h-4 w-4" />
          </Button>
          <Button
            data-testid="button-chat-close"
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {!infoSubmitted ? (
          <div className="flex-1 flex flex-col justify-center p-4 space-y-4">
            <div className="text-center">
              <p className="font-medium text-sm">Welcome!</p>
              <p className="text-xs text-muted-foreground mt-1">Please enter your name and email to start chatting.</p>
            </div>
            <div className="space-y-3">
              <Input
                data-testid="input-chat-name"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                onKeyPress={handleInfoKeyPress}
                placeholder="Your name *"
              />
              <Input
                data-testid="input-chat-email"
                type="email"
                value={chatEmail}
                onChange={(e) => setChatEmail(e.target.value)}
                onKeyPress={handleInfoKeyPress}
                placeholder="Your email *"
              />
              <Button
                data-testid="button-chat-start"
                className="w-full"
                onClick={handleInfoSubmit}
                disabled={!chatName.trim() || !chatEmail.trim()}
              >
                Start Chat
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <p>Welcome, {chatName}!</p>
                  <p className="mt-2">Send us a message and we'll respond as soon as possible.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.senderType === "visitor" ? "items-end" : "items-start"}`}
                    >
                      {msg.senderType === "bot" && (
                        <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                          Auto-reply
                        </span>
                      )}
                      <div
                        data-testid={`text-chat-message-${msg.senderType}`}
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                          msg.senderType === "visitor"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {renderMessageWithLinks(msg.message)}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
            <div className="p-3 border-t flex gap-2">
              <Input
                data-testid="input-chat-message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                data-testid="button-chat-send"
                onClick={sendMessage}
                disabled={!newMessage.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
