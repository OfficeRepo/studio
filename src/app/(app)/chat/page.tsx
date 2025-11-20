'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SendHorizonal, Bot, User, CircleDashed, CornerDownLeft, BotMessageSquare, History, Trash2, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { answerVulnerabilityQuestions } from '@/app/actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useData, type Message } from '@/context/DataContext';
import { motion } from 'framer-motion';

export default function ChatPage() {
  const { messages, setMessages, chatHistories, currentChatId, loadChat, deleteChat, startNewChat } = useData();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const result = await answerVulnerabilityQuestions({ question: messageContent });
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't process your request. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Error fetching answer:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, setMessages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSendMessage(input);
    setInput('');
  };
  
  useEffect(() => {
    const scrollable = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (scrollable) {
      scrollable.scrollTo({
        top: scrollable.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);
  
  const suggestions = [
    "List all products",
    "Show me all KEVs in Carelink Network.",
    "Which component is the riskiest?",
    "How many critical findings are in MCLS?",
  ];

  return (
    <div className="flex h-[calc(100vh_-_theme(spacing.24))] flex-col bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      {/* Header with History Button */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Chat
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={startNewChat}>
            <Plus className="h-4 w-4 mr-1" />
            New Chat
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-1" />
                History ({chatHistories.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Chat History</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
                <div className="space-y-2">
                  {chatHistories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No chat history yet
                    </p>
                  ) : (
                    chatHistories
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((chat) => (
                        <Card
                          key={chat.id}
                          className={cn(
                            "cursor-pointer hover:bg-accent transition-colors",
                            currentChatId === chat.id && "border-primary bg-accent"
                          )}
                          onClick={() => loadChat(chat.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {chat.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(chat.timestamp).toLocaleDateString()} {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {chat.messages.length} messages
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteChat(chat.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 sm:p-6 space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center pt-16 animate-fade-in">
              <BotMessageSquare className="h-16 w-16 text-primary mb-4" />
              <h2 className="text-2xl font-semibold">Welcome to DojoGPT</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Ask me anything about your vulnerabilities in DefectDojo. I can help you find, analyze, and manage security findings.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                {suggestions.map((s, i) => (
                    <Card 
                      key={s} 
                      className="hover:bg-accent cursor-pointer animate-slide-in-from-bottom"
                      style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
                      onClick={() => handleSendMessage(s)}>
                        <CardContent className="p-4">
                            <p className="text-sm font-medium text-center">{s}</p>
                        </CardContent>
                    </Card>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'flex items-start gap-4',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-10 h-10 flex items-center justify-center rounded-full 
                                bg-gradient-to-br from-purple-500 to-pink-500
                                text-2xl
                                shadow-[0_0_20px_rgba(168,85,247,0.8)]">
                  🤖
                </div>
              )}
              {message.role === 'assistant' ? (
                <div className="max-w-xl p-[2px] rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(99,102,241,0.4),0_0_30px_rgba(168,85,247,0.3)] animate-pulse">
                  <div className="bg-card text-card-foreground rounded-lg px-4 py-3 text-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-table:text-foreground prose-thead:text-foreground prose-tr:text-foreground prose-th:text-foreground prose-td:text-foreground"
                      components={{
                        p: ({node, ...props}) => <p className="leading-relaxed mb-4 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="space-y-2 list-disc list-outside ml-4 mb-4" {...props} />,
                        ol: ({node, ...props}) => <ol className="space-y-2 list-decimal list-outside ml-4 mb-4" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-md font-semibold mb-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-md font-semibold mb-2" {...props} />,
                        hr: ({node, ...props}) => <hr className="my-4 border-border" {...props} />,
                        table: ({node, ...props}) => <table className="w-full my-4 border-collapse border border-border" {...props} />,
                        thead: ({node, ...props}) => <thead className="bg-muted" {...props} />,
                        tr: ({node, ...props}) => <tr className="border-b border-border" {...props} />,
                        th: ({node, ...props}) => <th className="p-3 text-left font-semibold border-x border-border" {...props} />,
                        td: ({node, ...props}) => <td className="p-3 border-x border-border" {...props} />,
                      }}
                    >{message.content}</ReactMarkdown>
                  </div>
                </div>
              ) : (
              <div
                className={cn(
                  'max-w-xl rounded-lg px-4 py-3 text-sm',
                  'bg-primary text-primary-foreground'
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              )}
              {message.role === 'user' && (
                <div className="w-10 h-10 flex items-center justify-center rounded-full 
                                bg-gradient-to-br from-blue-500 to-cyan-500
                                text-2xl
                                shadow-[0_0_20px_rgba(59,130,246,0.8)]">
                  👤
                </div>
              )}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full 
                              bg-gradient-to-br from-purple-500 to-pink-500
                              text-2xl
                              shadow-[0_0_20px_rgba(168,85,247,0.8)]">
                🤖
              </div>
              <div className="p-[2px] rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(99,102,241,0.4),0_0_30px_rgba(168,85,247,0.3)] animate-pulse">
                <div className="rounded-lg bg-card px-6 py-4 text-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-primary rounded-full dot-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full dot-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full dot-bounce"></div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t bg-card rounded-b-xl p-4">
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about vulnerabilities, products, or findings..."
            className="pr-20 resize-none bg-background"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            disabled={isLoading || !input.trim()}
          >
            <SendHorizonal className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
         <p className="text-xs text-muted-foreground mt-2 text-center">
            Press <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">Shift</span>+<CornerDownLeft className="h-3 w-3" />
            </kbd> for a new line.
        </p>
      </div>
    </div>
  );
}
