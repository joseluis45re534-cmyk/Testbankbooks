import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, MessageCircle, User, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  conversationId: string;
  message: string;
  senderType: "visitor" | "admin";
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  visitorId: string;
  visitorName: string | null;
  visitorEmail: string | null;
  status: string;
  createdAt: string;
  lastMessageAt: string;
  messages: Message[];
  unreadCount: number;
}

export default function AdminChat() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/admin/chat/conversations"],
    refetchInterval: 5000,
  });

  const { data: activeConversation } = useQuery<Conversation>({
    queryKey: ["/api/admin/chat/conversations", selectedConversation],
    enabled: !!selectedConversation,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; message: string }) => {
      const response = await apiRequest("POST", "/api/admin/chat/message", data);
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/conversations", selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/conversations"] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await apiRequest("POST", `/api/admin/chat/mark-read/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/conversations"] });
    },
  });

  const closeConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await apiRequest("POST", `/api/admin/chat/close/${conversationId}`);
    },
    onSuccess: () => {
      setSelectedConversation(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/conversations"] });
    },
  });

  useEffect(() => {
    if (selectedConversation) {
      markAsReadMutation.mutate(selectedConversation);
    }
  }, [selectedConversation, activeConversation?.messages?.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      message: newMessage.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Chat</h1>
            <p className="text-muted-foreground">Respond to customer messages</p>
          </div>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-sm">
              {totalUnread} unread
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No conversations yet
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        data-testid={`button-conversation-${conv.id}`}
                        onClick={() => setSelectedConversation(conv.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedConversation === conv.id
                            ? "bg-primary text-primary-foreground"
                            : "hover-elevate"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span className="font-medium text-sm">
                              {conv.visitorName || `Visitor ${conv.visitorId.slice(-6)}`}
                            </span>
                          </div>
                          {conv.unreadCount > 0 && selectedConversation !== conv.id && (
                            <Badge variant="destructive" className="text-xs">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs opacity-70 truncate">
                          {conv.messages[conv.messages.length - 1]?.message || "No messages"}
                        </p>
                        <p className="text-xs opacity-50 mt-1">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 flex flex-col">
            {selectedConversation && activeConversation ? (
              <>
                <CardHeader className="py-4 border-b flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">
                      {activeConversation.visitorName || `Visitor ${activeConversation.visitorId.slice(-6)}`}
                    </CardTitle>
                    {activeConversation.visitorEmail && (
                      <p className="text-sm text-muted-foreground">{activeConversation.visitorEmail}</p>
                    )}
                  </div>
                  <Button
                    data-testid="button-close-conversation"
                    variant="ghost"
                    size="sm"
                    onClick={() => closeConversationMutation.mutate(selectedConversation)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Close Chat
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {activeConversation.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                              msg.senderType === "admin"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p>{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t flex gap-2">
                    <Input
                      data-testid="input-admin-message"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your reply..."
                      className="flex-1"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      data-testid="button-admin-send"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
