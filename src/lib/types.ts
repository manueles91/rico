export interface Account {
  id: string
  name: string
  avatar: string
  type: "personal" | "business" | "shared"
}

export interface ExpenseContent {
  amount: number
  description: string
  vendor: string
  date: string
  categories?: string[]
  text?: never
  imageUrl?: never
  caption?: never
  summary?: never
}

export interface TextContent {
  text: string
  amount?: never
  description?: never
  vendor?: never
  date?: never
  categories?: never
  imageUrl?: never
  caption?: never
  summary?: never
}

export interface ImageContent {
  imageUrl: string
  caption?: string
  amount?: never
  description?: never
  vendor?: never
  date?: never
  categories?: never
  text?: never
  summary?: never
}

export interface SummaryContent {
  text: string
  summary: {
    total: number
    categories: Array<{
      name: string
      amount: number
    }>
  }
  amount?: never
  description?: never
  vendor?: never
  date?: never
  categories?: never
  imageUrl?: never
  caption?: never
}

export type MessageContent = ExpenseContent | TextContent | ImageContent | SummaryContent

export interface Message {
  id: string
  content: MessageContent
  timestamp: Date
  type: "expense" | "text" | "image" | "summary"
  sender?: "user" | "assistant"
}

