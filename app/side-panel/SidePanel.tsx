'use client';

// Conversation UI moved into TabOne view
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TabOne from "@/app/side-panel/views/TabOne"
import TabTwo from "@/app/side-panel/views/TabTwo"
import TabThree from "@/app/side-panel/views/TabThree"
// Prompt input moved into TabOne view
import { useState, Fragment, useMemo, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
// Auxiliary UI moved into TabOne view

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
      <Tabs defaultValue="chat" className="px-2 pt-2 mb-2 flex h-full flex-col">
            <TabsList>
              <TabsTrigger value="chat">Ask me anything</TabsTrigger>
              <TabsTrigger value="editor">Tab 2</TabsTrigger>
              <TabsTrigger value="new">Tab 3</TabsTrigger>
            </TabsList>
        <TabsContent value="chat" className="m-0 p-0 border-0 flex-1 min-h-0">
          <TabOne
            messages={messages as unknown as ChatMessage[]}
            lastSources={lastSources}
            isThinking={isThinking}
            thinkingText={thinkingText}
            taskItems={taskItems}
            regenerate={regenerate}
            status={status}
            suggestions={suggestions}
            setSuggestions={(updater) => setSuggestions((prev) => updater(prev))}
            processUserText={processUserText}
            handleSubmit={handleSubmit}
            input={input}
            setInput={setInput}
            webSearch={webSearch}
            setWebSearch={setWebSearch}
            model={model}
            setModel={setModel}
            models={models}
            lastMessage={lastMessage}
          />
        </TabsContent>
        <TabsContent value="editor" className="m-0 p-0 border-0 flex-1 min-h-0">
          <TabTwo />
        </TabsContent>
        <TabsContent value="new" className="m-0 p-0 border-0 flex-1 min-h-0">
          <TabThree />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default ChatBotDemo;
