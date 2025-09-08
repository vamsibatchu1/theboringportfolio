"use client"

import { Fragment } from "react"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent } from '@/components/ai-elements/message'
import { Actions, Action } from '@/components/ai-elements/actions'
import { Response } from '@/components/ai-elements/response'
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import { CopyIcon, RefreshCcwIcon, GlobeIcon } from 'lucide-react'
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { Task, TaskContent, TaskItem, TaskTrigger } from '@/components/ai-elements/task'
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
} from '@/components/ai-elements/inline-citation'
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
} from '@/components/ai-elements/prompt-input'

type ChatPart =
  | { type: 'text'; text: string }
  | { type: 'source-url'; url: string }
  | { type: 'reasoning'; text: string }

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content?: string
  parts?: ChatPart[]
}

type SourceItem = {
  title: string
  url: string
  description?: string
}

type ModelOption = { name: string; value: string }

export default function TabOne(props: {
  messages: ChatMessage[]
  lastSources: SourceItem[]
  isThinking: boolean
  thinkingText: string
  taskItems: string[]
  regenerate: () => void
  status: string
  suggestions: string[]
  setSuggestions: (updater: (prev: string[]) => string[]) => void
  processUserText: (text: string) => Promise<void> | void
  handleSubmit: (e: React.FormEvent) => Promise<void> | void
  input: string
  setInput: (v: string) => void
  webSearch: boolean
  setWebSearch: (v: boolean) => void
  model: string
  setModel: (v: string) => void
  models: ModelOption[]
  lastMessage?: ChatMessage
}) {
  const {
    messages,
    lastSources,
    isThinking,
    thinkingText,
    taskItems,
    regenerate,
    status,
    suggestions,
    setSuggestions,
    processUserText,
    handleSubmit,
    input,
    setInput,
    webSearch,
    setWebSearch,
    model,
    setModel,
    models,
    lastMessage,
  } = props

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="flex-1 min-h-0 overflow-auto">
        <ConversationContent>
          {messages.map((message) => (
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
                        isStreaming={status === 'streaming' && i === (message.parts?.length ?? 0) - 1 && message.id === messages.at(-1)?.id}
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
          {lastMessage?.role !== 'user' && (
            <Message from="assistant">
              <MessageContent>
                <Response>
                 
                </Response>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mt-2 px-2">
        {/* redundant Suggestions rendered above to match original layout */}
      </div>

      <div id="bottom-section" className="sticky bottom-0 bg-background">
      {/* Suggestions */}
      <Suggestions className="pl-3">
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

      {/* Prompt input */}
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
                setModel(value)
              }}
              value={model}
            >
              <PromptInputModelSelectTrigger>
                <PromptInputModelSelectValue />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent>
                {models.map((m) => (
                  <PromptInputModelSelectItem key={m.value} value={m.value}>
                    {m.name}
                  </PromptInputModelSelectItem>
                ))}
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
          </PromptInputTools>
          <PromptInputSubmit disabled={!input} status={status as 'submitted' | undefined} />
        </PromptInputToolbar>
      </PromptInput>
      </div>
    </div>
  )
}


