import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { getCompletion } from '../../services/aiCompletion';

// 定义消息接口
export interface Message {
  content: string; // 消息内容
  isUser: boolean; // 是否是用户发送的消息
  timestamp?: number; // 消息时间戳（可选）
}

// 本地存储的键名
const STORAGE_KEY = 'ai-chat-messages';

// 自定义钩子，用于处理AI聊天逻辑
export function useAIChat() {
  // 使用useState钩子管理消息列表
  const [messages, setMessages] = useState<Message[]>([]);
  // 使用useState钩子管理输入框内容
  const [input, setInput] = useState('');
  // 使用useState钩子管理加载状态
  const [loading, setLoading] = useState(false);

  // useEffect钩子，在组件初始化时加载历史消息
  useEffect(() => {
    loadMessages();
  }, []);

  // 加载历史消息的函数
  const loadMessages = async () => {
    try {
      // 从localforage中获取存储的消息
      const storedMessages = await localforage.getItem<Message[]>(STORAGE_KEY);
      // 如果有存储的消息，则更新状态
      if (storedMessages) {
        setMessages(storedMessages);
      }
    } catch (error) {
      // 错误处理，输出到控制台
      console.error('加载历史消息失败:', error);
    }
  };

  // 保存消息到本地存储的函数
  const saveMessages = async (newMessages: Message[]) => {
    try {
      // 将新的消息列表保存到localforage
      await localforage.setItem(STORAGE_KEY, newMessages);
    } catch (error) {
      // 错误处理，输出到控制台
      console.error('保存消息失败:', error);
    }
  };

  // 构建对话上下文的函数
  const buildContext = (messages: Message[]): string => {
    return messages
      .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  };

  // 发送消息的函数
  const sendMessage = async () => {
    // 如果输入内容为空，则直接返回
    if (!input.trim()) return;

    // 创建用户消息对象
    const userMessage: Message = {
      content: input,
      isUser: true,
      timestamp: Date.now() // 当前时间戳
    };

    // 更新消息列表
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    // 保存新的消息列表到本地存储
    await saveMessages(newMessages);
    // 清空输入框
    setInput('');
    // 设置加载状态为true
    setLoading(true);

    try {
      // 构建对话上下文
      const context = buildContext(messages);
      // 调用AI服务获取回复，传入上下文
      const response = await getCompletion(input, context);
      if (response) {
        const aiMessage: Message = {
          content: response.replace(/[\[\]\`\*\_\#]/g, '\\$&'),  // 转义markdown特殊字符
          isUser: false,
          timestamp: Date.now()
        };
        const updatedMessages = [...newMessages, aiMessage];
        setMessages(updatedMessages);
        await saveMessages(updatedMessages);
      }
    } catch (error) {
      // 错误处理，输出到控制台
      console.error('AI回复失败:', error);
    } finally {
      // 无论成功还是失败，都设置加载状态为false
      setLoading(false);
    }
  };

  // 清空历史记录的函数
  const clearHistory = async () => {
    // 清空状态中的消息列表
    setMessages([]);
    // 从localforage中移除存储的消息
    await localforage.removeItem(STORAGE_KEY);
  };

  // 返回自定义钩子的状态和函数
  return {
    messages, // 消息列表
    input, // 输入框内容
    setInput, // 设置输入框内容的函数
    loading, // 加载状态
    sendMessage, // 发送消息的函数
    clearHistory // 清空历史记录的函数
  };
}