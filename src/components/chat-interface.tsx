"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Camera, Image, Send, Plus, X, Paperclip, User, Settings, LogOut, Sun, Moon } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import MessageItem from "./message-item"
import type { Message, Account } from "@/lib/types"
import { useMobile } from "@/hooks/use-mobile"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export default function ChatInterface() {
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)

    // Update the HTML class for theme
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  // Initialize theme on component mount
  useEffect(() => {
    // Check if user has a saved preference
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme) {
      setTheme(savedTheme as "light" | "dark")
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }, [])

  // Save theme preference when it changes
  useEffect(() => {
    localStorage.setItem("theme", theme)
  }, [theme])

  const [selectedAccount, setSelectedAccount] = useState<Account>({
    id: "1",
    name: "Manuel Barrantes",
    avatar: "M",
    type: "personal",
  })

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: {
        amount: 19.72,
        description: "Gym membership",
        vendor: "Smart Fit Guadalupe",
        date: "2025-03-19",
        categories: ["Health", "Fitness"],
      },
      timestamp: new Date("2025-03-19"),
      type: "expense",
    },
    {
      id: "2",
      content: {
        amount: 69.0,
        description: "Cancha 1 Hora 30 Min Padel, Alquiler Pala Padel",
        vendor: "Volea Padel & Pickleball Club",
        date: "2025-01-14",
        categories: ["Sports", "Recreation"],
      },
      timestamp: new Date("2025-01-14"),
      type: "expense",
    },
  ])

  const [inputValue, setInputValue] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [quickReplies] = useState([
    "Show my expenses for this month",
    "How much did I spend on food?",
    "Add new transaction",
  ])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()

  const accounts: Account[] = [
    selectedAccount,
    { id: "2", name: "Work Expenses", avatar: "W", type: "business" },
    { id: "3", name: "Family Budget", avatar: "F", type: "shared" },
  ]

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [showCamera, cameraStream])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        content: { text: inputValue },
        timestamp: new Date(),
        type: "text",
        sender: "user",
      }
      setMessages([...messages, newMessage])
      setInputValue("")

      // Simulate assistant response
      setTimeout(() => {
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: {
            text: "I've analyzed your spending patterns. Would you like to see a breakdown of your expenses by category?",
          },
          timestamp: new Date(),
          type: "text",
          sender: "assistant",
        }
        setMessages((prev) => [...prev, responseMessage])
      }, 1000)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const newMessage: Message = {
          id: Date.now().toString(),
          content: { imageUrl: event.target?.result as string },
          timestamp: new Date(),
          type: "image",
          sender: "user",
        }
        setMessages([...messages, newMessage])
        setIsExpanded(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCameraCapture = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })
        setCameraStream(stream)
        setShowCamera(true)
      } catch (err) {
        console.error("Error accessing camera:", err)
      }
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const context = canvas.getContext("2d")
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageUrl = canvas.toDataURL("image/png")
        const newMessage: Message = {
          id: Date.now().toString(),
          content: { imageUrl },
          timestamp: new Date(),
          type: "image",
          sender: "user",
        }

        setMessages([...messages, newMessage])
        setShowCamera(false)

        if (cameraStream) {
          cameraStream.getTracks().forEach((track) => track.stop())
          setCameraStream(null)
        }
      }
    }
  }

  const closeCamera = () => {
    setShowCamera(false)
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
  }

  const createNewAccount = () => {
    // In a real app, this would open a modal or navigate to a new account creation page
    const newAccount: Account = {
      id: (accounts.length + 1).toString(),
      name: "New Account",
      avatar: "N",
      type: "personal",
    }
    setSelectedAccount(newAccount)
  }

  const handleQuickReply = (reply: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content: { text: reply },
      timestamp: new Date(),
      type: "text",
      sender: "user",
    }
    setMessages([...messages, newMessage])

    // Simulate response based on the quick reply
    setTimeout(() => {
      let responseMessage: Message

      if (reply.includes("expenses for this month")) {
        responseMessage = {
          id: (Date.now() + 1).toString(),
          content: {
            text: "Here's a summary of your expenses for this month:",
            summary: {
              total: 1245.72,
              categories: [
                { name: "Food", amount: 320.45 },
                { name: "Fitness", amount: 150.0 },
                { name: "Entertainment", amount: 275.27 },
                { name: "Transportation", amount: 180.0 },
                { name: "Other", amount: 320.0 },
              ],
            },
          },
          timestamp: new Date(),
          type: "summary",
          sender: "assistant",
        }
      } else if (reply.includes("food")) {
        responseMessage = {
          id: (Date.now() + 1).toString(),
          content: {
            text: "You've spent $320.45 on food this month. That's 25% of your total spending.",
          },
          timestamp: new Date(),
          type: "text",
          sender: "assistant",
        }
      } else {
        responseMessage = {
          id: (Date.now() + 1).toString(),
          content: {
            text: "I'll help you add a new transaction. What did you purchase?",
          },
          timestamp: new Date(),
          type: "text",
          sender: "assistant",
        }
      }

      setMessages((prev) => [...prev, responseMessage])
    }, 1000)
  }

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "business":
        return "💼"
      case "shared":
        return "👪"
      default:
        return "👤"
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-950 dark:bg-black text-black dark:text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-gray-900 dark:bg-gray-900 rounded-b-xl shadow-md">
        <div className="flex items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Rico
          </h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center justify-between w-64 bg-gray-800/50 hover:bg-gray-800 dark:bg-gray-800/50 dark:hover:bg-gray-800 rounded-full text-white"
            >
              <div className="flex items-center">
                <Avatar className="h-7 w-7 mr-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  <span>{selectedAccount.avatar}</span>
                </Avatar>
                <span className="truncate">{selectedAccount.name}</span>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 bg-gray-900 dark:bg-gray-900 text-black dark:text-white border-gray-200 dark:border-gray-800 rounded-xl shadow-xl"
          >
            {accounts.map((account) => (
              <DropdownMenuItem
                key={account.id}
                onClick={() => setSelectedAccount(account)}
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg my-1 py-2"
              >
                <div className="flex items-center w-full">
                  <Avatar className="h-8 w-8 mr-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    <span>{account.avatar}</span>
                  </Avatar>
                  <div className="flex flex-col">
                    <span>{account.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      {getAccountTypeIcon(account.type)} {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />
            <DropdownMenuItem
              onClick={createNewAccount}
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg my-1 py-2"
            >
              <div className="flex items-center text-blue-500 dark:text-blue-400 w-full">
                <Avatar className="h-8 w-8 mr-3 bg-blue-500/20 text-blue-500 dark:text-blue-400">
                  <Plus className="h-4 w-4" />
                </Avatar>
                <span>Create new account</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 text-white cursor-pointer">
              <span>{selectedAccount.avatar}</span>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-white dark:bg-gray-900 text-black dark:text-white border-gray-200 dark:border-gray-800 rounded-xl shadow-xl"
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <p className="text-sm font-medium">Manuel Barrantes</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">manuel@example.com</p>
            </div>
            <DropdownMenuItem
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg my-1 py-2 px-4"
              onClick={() => console.log("Navigate to profile")}
            >
              <div className="flex items-center w-full">
                <div className="h-8 w-8 mr-3 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <span>Profile</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg my-1 py-2 px-4"
              onClick={() => console.log("Navigate to settings")}
            >
              <div className="flex items-center w-full">
                <div className="h-8 w-8 mr-3 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <span>Settings</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg my-1 py-2 px-4"
              onClick={toggleTheme}
            >
              <div className="flex items-center w-full">
                <div className="h-8 w-8 mr-3 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />
            <DropdownMenuItem
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-red-500 rounded-lg my-1 py-2 px-4"
              onClick={() => console.log("Logout")}
            >
              <div className="flex items-center w-full">
                <div className="h-8 w-8 mr-3 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                  <LogOut className="h-4 w-4 text-red-500" />
                </div>
                <span>Logout</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-950 to-gray-900 dark:from-black dark:to-gray-900">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className={cn("max-w-[85%]", message.sender === "user" ? "ml-auto" : "mr-auto")}
            >
              <MessageItem
                message={message}
                isConsecutive={index > 0 && messages[index - 1].sender === message.sender}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}

      {/* Input Area */}
      <div className="p-4 bg-gray-900 dark:bg-gray-900 rounded-t-xl shadow-inner">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-white"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </Button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex space-x-2 overflow-hidden"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-5 w-5" />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-white"
                  onClick={handleCameraCapture}
                >
                  <Camera className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-white"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="w-full p-3 bg-gray-800 dark:bg-gray-800 border-none rounded-full text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full transition-all duration-300",
              inputValue.trim()
                ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                : "bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-white",
            )}
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Camera Overlay */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex justify-between items-center p-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-gray-800/50 text-white"
              onClick={closeCamera}
            >
              <X className="h-5 w-5" />
            </Button>
            <h2 className="text-white font-medium">Take a photo</h2>
            <div className="w-10" />
          </div>

          <div className="flex-1 relative">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          </div>

          <div className="p-6 flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-16 w-16 rounded-full bg-white border-4 border-gray-800"
              onClick={capturePhoto}
            >
              <div className="h-12 w-12 rounded-full bg-gray-800" />
            </Button>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  )
}

