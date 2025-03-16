import { useState, useEffect } from "react";
import { Dropdown, Input, Button } from "antd";
import { RobotOutlined, SendOutlined, DeleteOutlined } from "@ant-design/icons";
import { useAIChat } from "./useAIChat";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

// 添加样式
const markdownStyles = `
  .code-block-wrapper {
    position: relative;
    margin: 16px 0;
  }

  .copy-button {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #007bff;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.3s;
  }

  .copy-button:hover {
    opacity: 0.8;
  }

  .streaming-indicator {
    display: inline-block;
    width: 8px;
    height: 8px;
    background: #007bff;
    border-radius: 50%;
    margin-left: 8px;
    animation: pulse 1.2s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
  }
`;

// 创建一个样式注入组件
function StyleInjector() {
	useEffect(() => {
		const styleElement = document.createElement("style");
		styleElement.innerHTML = markdownStyles;
		document.head.appendChild(styleElement);

		return () => {
			document.head.removeChild(styleElement);
		};
	}, []);

	return null;
}

// 渲染 Markdown 的组件
const MarkdownRenderer = ({ content }: { content: string }) => {
	// 自定义代码块渲染（添加复制按钮）
	const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
		const copyToClipboard = (code: string) => {
			navigator.clipboard.writeText(code);
			// 可以添加复制成功的提示
		};

		return inline ? (
			<code
				className={className}
				{...props}>
				{children}
			</code>
		) : (
			<div className="code-block-wrapper">
				<pre className={className}>
					<code {...props}>{children}</code>
				</pre>
				<button
					onClick={() => copyToClipboard(String(children))}
					className="copy-button">
					复制
				</button>
			</div>
		);
	};

	return (
		<ReactMarkdown
			children={content}
			remarkPlugins={[remarkGfm]}
			rehypePlugins={[rehypeHighlight]}
			components={{
				img: ({ node, ...props }: any) => (
					<img
						{...props}
						style={{ maxWidth: "100%", borderRadius: "8px" }}
						alt={props.alt || "图片"}
					/>
				),
				code: CodeBlock,
			}}
		/>
	);
};
export function AIChat({
	visible,
	onClose,
}: {
	visible: boolean;
	onClose: () => void;
}) {
	const { messages, input, setInput, loading, sendMessage, clearHistory } =
		useAIChat();

	// Handle key press for sending messages
	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};
	return (
		<div
			className={`fixed bottom-20 right-10 z-50 ${
				visible ? "block" : "hidden"
			}`}>
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-96 md:w-[40rem] h-[35rem] flex flex-col">
				<div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
					<h3 className="text-lg font-medium">AI 助手</h3>
					<div className="flex space-x-2">
						<Button
							type="text"
							icon={<DeleteOutlined />}
							onClick={clearHistory}
							title="清空历史记录"
						/>
						<Button
							type="text"
							onClick={onClose}>
							关闭
						</Button>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{messages.length === 0 ? (
						<div className="flex items-center justify-center h-full text-gray-500">
							开始新的对话...
						</div>
					) : (
						messages.map((message, index) => (
							<div
								key={index}
								className={`flex ${
									message.isUser ? "justify-end" : "justify-start"
								}`}>
								<div
									className={`max-w-[70%] p-3 rounded-lg ${
										message.isUser
											? "bg-blue-500 text-white"
											: "bg-gray-100 dark:bg-gray-700 dark:text-white"
									}`}>
									<MarkdownRenderer
										content={message.content}></MarkdownRenderer>
								</div>
							</div>
						))
					)}
					{loading && (
						<div className="flex justify-start">
							<div className="max-w-[70%] p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
								<div className="flex space-x-2">
									<div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
									<div
										className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
										style={{ animationDelay: "0.2s" }}></div>
									<div
										className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
										style={{ animationDelay: "0.4s" }}></div>
								</div>
							</div>
						</div>
					)}
				</div>
				<div className="p-4 border-t dark:border-gray-700">
					<div className="flex space-x-2">
						<Input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="输入你的问题..."
							disabled={loading}
							autoFocus
						/>
						<Button
							type="primary"
							onClick={sendMessage}
							icon={<SendOutlined />}
							loading={loading}
							disabled={!input.trim()}>
							发送
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

export function AIChatButton() {
	const [visible, setVisible] = useState(false);

	return (
		<>
			<Button
				type="text"
				icon={<RobotOutlined />}
				onClick={() => setVisible(true)}
				title="AI 助手"
			/>
			<AIChat
				visible={visible}
				onClose={() => setVisible(false)}
			/>
		</>
	);
}
