// aiCompletion.ts - Enhanced AI completion service

import axios from 'axios';
import { EventEmitter } from 'events';

const API_KEY = 'sk-Faba46210e43215588ed66bf33bf6463ce605917069D0h6a';
const API_BASE_URL = 'https://api.gptsapi.net/v1/chat/completions';

// 添加请求超时设置
const axiosInstance = axios.create({
  timeout: 15000, // 15秒超时
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// 添加请求拦截器用于日志记录
axiosInstance.interceptors.request.use((config) => {
  console.log('发送AI补全请求');
  return config;
}, (error) => {
  console.error('请求配置错误:', error);
  return Promise.reject(error);
});

// 添加响应拦截器处理错误
axiosInstance.interceptors.response.use((response) => {
  console.log('收到AI补全响应');
  return response;
}, (error) => {
  if (error.response) {
    // 服务器响应了，但状态码不在2xx范围
    console.error('AI补全服务响应错误:', error.response.status, error.response.data);
  } else if (error.request) {
    // 请求发送了，但没有收到响应
    console.error('AI补全服务无响应:', error.request);
  } else {
    // 请求配置出错
    console.error('AI补全请求配置错误:', error.message);
  }
  return Promise.reject(error);
});

export async function getStreamCompletion(prompt: string, context: string = '', lineContent: string = ''): Promise<EventEmitter> {
  const eventEmitter = new EventEmitter();

  try {
    console.log('开始请求AI流式补全:', { contextLength: context.length, lineContent });
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant,前端大神,使用中文回答用户的所有问题。'
          },
          {
            role: 'user',
            content:`${prompt}和${context}和${lineContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    let buffer = '';
    let partialLine = '';

    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            eventEmitter.emit('done');
            break;
          }

          const chunk = new TextDecoder().decode(value);
          const lines = (partialLine + chunk).split('\n');
          
          // Save the last line as it might be incomplete
          partialLine = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine === '') continue;
            
            if (trimmedLine === 'data: [DONE]') {
              eventEmitter.emit('done');
              return;
            }

            try {
              if (trimmedLine.startsWith('data: ')) {
                const jsonStr = trimmedLine.substring(6);
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices[0]?.delta?.content || '';
                
                if (content) {
                  buffer += content;
                  eventEmitter.emit('token', content);
                }
              }
            } catch (e) {
              console.error('解析流数据失败:', e, 'Line:', trimmedLine);
            }
          }
        }
      } catch (error) {
        console.error('流数据处理错误:', error);
        eventEmitter.emit('error', error);
      }
    };

    processStream().catch(error => {
      console.error('流处理过程错误:', error);
      eventEmitter.emit('error', error);
    });

  } catch (error) {
    console.error('AI流式补全请求失败:', error);
    eventEmitter.emit('error', error);
  }

  return eventEmitter;
}

export async function getCompletion(prompt: string, context: string = '', lineContent: string = '') {
  try {
    console.log('开始请求AI补全:', { contextLength: context.length, lineContent });
    
    const response = await axiosInstance.post(
      API_BASE_URL,
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. When answering, format your response properly including any code blocks with proper markdown syntax. 使用中文回答用户的所有问题。'
          },
          {
            role: 'user',
            content: `${prompt}\n\nCode context:\n\`\`\`typescript\n${context}\`\`\`\n\nCurrent line: ${lineContent}\n\nProvide completion suggestions:`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      }
    );
    
    if (response.data?.choices?.[0]?.message?.content) {
      console.log('AI补全成功获取结果');
      return response.data.choices[0].message.content;
    } else {
      console.error('AI补全响应格式异常:', response.data);
      return null;
    }
  } catch (error) {
    console.error('AI补全请求失败:', error);
    return null;
  }
}

// 导出测试函数，用于测试API连接
export async function testAIConnection() {
  try {
    const result = await getCompletion('Test connection', 'console.log("hello");', 'console.');
    return { success: !!result, result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}