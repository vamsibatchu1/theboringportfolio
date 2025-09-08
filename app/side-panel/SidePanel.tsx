'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Actions, Action } from '@/components/ai-elements/actions';
import { useState, Fragment, useMemo, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { Response } from '@/components/ai-elements/response';
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import { GlobeIcon, CopyIcon, RefreshCcwIcon } from 'lucide-react';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
// import { Loader } from '@/components/ai-elements/loader';
import { Task, TaskContent, TaskItem, TaskTrigger } from '@/components/ai-elements/task';
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselItem,
  InlineCitationSource,
} from '@/components/ai-elements/inline-citation';

type ChatPart =
  | { type: 'text'; text: string }
  | { type: 'source-url'; url: string }
  | { type: 'reasoning'; text: string };

type ChatRole = 'user' | 'assistant' | 'system';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content?: string;
  parts?: ChatPart[];
};

type SourceItem = {
  title: string;
  url: string;
  description?: string;
};

const models = [
  {
    name: 'Deepseek R1',
    value: 'deepseek/deepseek-r1',
  },
  {
    name: 'GPT 4o',
    value: 'openai/gpt-4o',
  },
];

const ChatBotDemo = () => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const { messages, sendMessage, status } = useChat();
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingText, setThinkingText] = useState('')
  const [taskItems, setTaskItems] = useState<string[]>([])
  const [lastSources, setLastSources] = useState<SourceItem[]>([])
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([
    'What research methods did you use?',
    'What were the key user insights?',
    'Show the impact and success metrics',
    'Explain the design decisions and trade‑offs',
    'Walk me through the process and timeline',
  ])

  const buildThinkingFor = (text: string) => {
    const q = text.toLowerCase()
    if (q.includes('research')) {
      return {
        title: 'Scanning user research and findings…',
        items: [
          'Identify study type and participants',
          'Surface key insights and pain points',
          'Map insights to solution directions',
          'Assemble citations from research notes',
        ],
      }
    }
    if (q.includes('impact') || q.includes('results') || q.includes('metrics')) {
      return {
        title: 'Collecting outcomes and impact metrics…',
        items: [
          'Locate KPIs before/after launch',
          'Summarize quantitative lifts',
          'Pull qualitative feedback highlights',
          'Cross‑check assumptions with data',
        ],
      }
    }
    if (q.includes('process') || q.includes('approach') || q.includes('timeline')) {
      return {
        title: 'Reconstructing design process from case study…',
        items: [
          'Outline phases and milestones',
          'Extract artifacts (flows, wireframes, tests)',
          'Link decisions to evidence',
          'Prepare concise narrative',
        ],
      }
    }
    return {
      title: 'Reading the case study and preparing an answer…',
      items: [
        'Parse question intent',
        'Skim relevant sections',
        'Draft answer structure',
        'Fill details and sources',
      ],
    }
  }

  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current)
    }
  }, [])
  const lastMessage = messages.at(-1) as unknown as (ChatMessage | undefined);
  const lastIsUser = lastMessage?.role === 'user';
  const shouldShowMockAssistant = useMemo(() => {
    // When last message is user and we're not actively submitting/streaming, fake a reply
    return lastIsUser && status === 'ready';
  }, [lastIsUser, status]);
  const regenerate = () => {
    const lastUser = [...(messages as unknown as ChatMessage[])].reverse().find((m) => m.role === 'user') as ChatMessage | undefined
    if (lastUser) {
      const lastUserText =
        lastUser.content ?? (lastUser.parts?.find((p) => p.type === 'text') as Extract<ChatPart, { type: 'text' }> | undefined)?.text ?? ''
      sendMessage({ text: lastUserText })
    }
  }

  const processUserText = async (userText: string) => {
    // Send user message into the local message list for UI
    sendMessage({ text: userText });
    // Start thinking immediately
    if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current)
    const thinking = buildThinkingFor(userText)
    setThinkingText(thinking.title)
    setTaskItems(thinking.items)
    setIsThinking(true)
    // Hit dummy service to guarantee reasoning + reply
    try {
      const res = await fetch('/api/dummy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText }),
      })
      const data = await res.json()
      setLastSources(Array.isArray(data?.sources) ? (data.sources.slice(0,5) as SourceItem[]) : [])
      thinkingTimerRef.current = setTimeout(() => {
        setIsThinking(false)
        // After thinking, push final text response and actions appear under it
        sendMessage({
          role: 'assistant',
          parts: [{ type: 'text', text: String(data?.reply || 'Here is a demo response.') } as ChatPart],
        } as unknown as Parameters<typeof sendMessage>[0])
      }, 3500)
    } catch {
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current)
      setIsThinking(false)
      sendMessage({
        role: 'assistant',
        parts: [{ type: 'text', text: 'Demo response (network error).'} as ChatPart],
      } as unknown as Parameters<typeof sendMessage>[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const userText = input;
      setInput('');
      await processUserText(userText)
    }
  };

  return (
    <div className="bg-background overflow-hidden rounded-lg border shadow h-full flex flex-col relative">
      <div className="flex flex-col h-full">
      <Tabs className="px-2 pt-2 mb-2">
            <TabsList>
              <TabsTrigger value="chat">Ask me anything</TabsTrigger>
              <TabsTrigger value="editor">Casestudy filters</TabsTrigger>
            </TabsList>
      </Tabs>
        <Conversation className="flex-1 min-h-0">
          <ConversationContent>
            {(messages as unknown as ChatMessage[]).map((message) => (
              <div key={message.id}>
                {message.role === 'assistant' && (message.parts?.filter((part) => part.type === 'source-url').length ?? 0) > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={(message.parts ?? []).filter(
                        (part) => part.type === 'source-url',
                      ).length}
                    />
                    {(message.parts ?? [])
                      .filter((part): part is Extract<ChatPart, { type: 'source-url' }> => part.type === 'source-url')
                      .map((part, i: number) => (
                      <SourcesContent key={`${message.id}-${i}`}>
                        <Source
                          key={`${message.id}-${i}`}
                          href={part.url}
                          title={part.url}
                        />
                      </SourcesContent>
                    ))}
                  </Sources>
                )}
                {(message.parts ?? []).map((part, i: number) => {
                  switch (part.type) {
                    case 'text':
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent className={message.role === 'user' ? 'bg-black text-white rounded-[16px] px-3 py-2' : undefined}>
                              <div className="flex flex-row flex-wrap items-baseline gap-2">
                                <Response className="inline">
                                  {(part as Extract<ChatPart, { type: 'text' }>).text}
                                </Response>
                                {message.role === 'assistant' && !!lastSources.length && (
                                  <InlineCitation>
                                    <InlineCitationCard>
                                      <InlineCitationCardTrigger sources={lastSources.map((s)=>s.url)} />
                                      <InlineCitationCardBody>
                                        <InlineCitationCarousel>
                                          <InlineCitationCarouselHeader>
                                            <InlineCitationCarouselIndex />
                                          </InlineCitationCarouselHeader>
                                          <InlineCitationCarouselContent>
                                            {lastSources.map((s, idx:number)=> (
                                              <InlineCitationCarouselItem key={idx}>
                                                <InlineCitationSource title={s.title} url={s.url} description={s.description} />
                                              </InlineCitationCarouselItem>
                                            ))}
                                          </InlineCitationCarouselContent>
                                        </InlineCitationCarousel>
                                      </InlineCitationCardBody>
                                    </InlineCitationCard>
                                  </InlineCitation>
                                )}
                              </div>
                            </MessageContent>
                          </Message>
                          {message.role === 'assistant' && i === (message.parts?.length ?? 0) - 1 && (
                            <Actions className="mt-1">
                              <Action
                                onClick={() => regenerate()}
                                label="Retry"
                              >
                                <RefreshCcwIcon className="size-3" />
                              </Action>
                              <Action
                                onClick={() =>
                                  navigator.clipboard.writeText((part as Extract<ChatPart, { type: 'text' }>).text)
                                }
                                label="Copy"
                              >
                                <CopyIcon className="size-3" />
                              </Action>
                            </Actions>
                          )}
                        </Fragment>
                      );
                    case 'reasoning':
                      return (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className="w-full"
                          isStreaming={status === 'streaming' && i === (message.parts?.length ?? 0) - 1 && message.id === (messages as unknown as ChatMessage[]).at(-1)?.id}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{(part as Extract<ChatPart, { type: 'reasoning' }>).text}</ReasoningContent>
                        </Reasoning>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            ))}
            {isThinking && (
              <Task className="w-full">
                <TaskTrigger title={thinkingText || 'Thinking…'} />
                <TaskContent>
                  {taskItems.map((t, idx) => (
                    <TaskItem key={idx}>{t}</TaskItem>
                  ))}
                </TaskContent>
              </Task>
            )}
            {shouldShowMockAssistant && (
              <Message from="assistant">
                <MessageContent>
                  <Response>
                    {`Here is a demo response to your message: "${lastMessage?.content ?? ''}"`}
                  </Response>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="mt-2 px-2">
          <Suggestions>
            {suggestions.map((s) => (
              <Suggestion
                key={s}
                suggestion={s}
                onClick={async (text) => {
                  setSuggestions((prev) => prev.filter((x) => x !== text))
                  await processUserText(text)
                }}
              />
            ))}
          </Suggestions>
        </div>

        <PromptInput onSubmit={handleSubmit} className="mt-2 flex-shrink-0 border-0 px-2 py-2 shadow-none">
          <PromptInputTextarea
            className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
          <PromptInputToolbar className="border-0 shadow-none">
            <PromptInputTools>
              <PromptInputButton
                variant={webSearch ? 'default' : 'ghost'}
                onClick={() => setWebSearch(!webSearch)}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              <PromptInputModelSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((model) => (
                    <PromptInputModelSelectItem key={model.value} value={model.value}>
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBotDemo;
