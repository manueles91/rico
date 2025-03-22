import type { Message } from "@/lib/types"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { BarChart3, Calendar, Tag } from "lucide-react"

interface MessageItemProps {
  message: Message
  isConsecutive?: boolean
}

export default function MessageItem({ message, isConsecutive = false }: MessageItemProps) {
  const isUser = message.sender === "user"

  const getBubbleStyle = () => {
    const baseStyle = "p-3 shadow-sm"

    if (isUser) {
      return cn(baseStyle, "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl rounded-tr-sm")
    } else {
      return cn(baseStyle, "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-2xl rounded-tl-sm")
    }
  }

  if (message.type === "expense") {
    const expense = message.content
    return (
      <div className={cn("mb-2", isConsecutive ? "mt-1" : "mt-4")}>
        <div
          className={cn(
            "rounded-xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md",
            isUser ? "ml-auto" : "mr-auto",
          )}
        >
          <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-gray-500 dark:text-gray-400 text-xs mr-2">{expense.vendor}</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">${expense.amount.toFixed(2)}</span>
          </div>
          <div className="p-3">
            <p className="text-gray-900 dark:text-white font-medium mb-2">{expense.description}</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {expense.categories?.map((category, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {category}
                </span>
              ))}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {expense.date}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (message.type === "image") {
    return (
      <div className={cn("mb-2", isConsecutive ? "mt-1" : "mt-4")}>
        <div className={getBubbleStyle()}>
          <div className="relative h-60 w-full rounded-lg overflow-hidden">
            <Image
              src={message.content.imageUrl || "/placeholder.svg"}
              alt={message.content.caption || "Uploaded image"}
              fill
              className="object-cover"
            />
          </div>
          {message.content.caption && <p className="mt-2 text-sm">{message.content.caption}</p>}
        </div>
      </div>
    )
  }

  if (message.type === "summary") {
    const summary = message.content.summary
    return (
      <div className={cn("mb-2", isConsecutive ? "mt-1" : "mt-4")}>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-gray-900 dark:text-white">{message.content.text}</p>
          </div>
          <div className="p-3">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-500 dark:text-gray-400">Total Spending</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">${summary?.total.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              {summary?.categories.map((category, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{
                        backgroundColor: `hsl(${index * 60}, 70%, 60%)`,
                      }}
                    />
                    <span className="text-gray-700 dark:text-gray-300">{category.name}</span>
                  </div>
                  <span className="text-gray-900 dark:text-white">${category.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-center">
              <button className="text-blue-500 dark:text-blue-400 text-sm flex items-center">
                <BarChart3 className="h-4 w-4 mr-1" />
                View detailed report
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default text message
  return (
    <div className={cn("mb-2", isConsecutive ? "mt-1" : "mt-4")}>
      <div className={getBubbleStyle()}>
        <p>{message.content.text}</p>
      </div>
    </div>
  )
}

