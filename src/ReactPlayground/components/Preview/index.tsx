import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { PlaygroundContext } from "../../PlaygroundContext";
// import Editor from "../CodeEditor/Editor";
import iframeRaw from "./iframe.html?raw";
import { IMPORT_MAP_FILE_NAME } from "../../files";
import { Message } from "../Message";
import CompilerWorker from "./compiler.worker?worker";
import { debounce } from "lodash-es";
import { Allotment } from "allotment";
import "allotment/dist/style.css";

interface MessageData {
	data: {
		type: string;
		message: string;
	};
}

export default function Preview() {
	const { files } = useContext(PlaygroundContext);
	const [compiledCode, setCompiledCode] = useState<string>("");
	const [error, setError] = useState<string>("");
	const [showError, setShowError] = useState(false);

	const compilerWorkerRef = useRef<Worker | null>(null);
	// 创建一个 URL 池来管理所有创建的 URL
	const urlPoolRef = useRef<string[]>([]);

	// 添加一个状态表示是否正在编译
	const [isCompiling, setIsCompiling] = useState(false);

	const [iframeUrls, setIframeUrls] = useState<[string, string]>(["", ""]);
	const [activeIframeIndex, setActiveIframeIndex] = useState<0 | 1>(0);
	const inactiveIframeIndex = activeIframeIndex === 0 ? 1 : 0;

	// 添加一个引用来跟踪上次内容，避免不必要的更新
	const lastContentRef = useRef<string>("");

	// 初始化 Worker
	useEffect(() => {
		if (!compilerWorkerRef.current) {
			const worker = new CompilerWorker();

			worker.addEventListener(
				"message",
				({
					data,
				}: {
					data: { type: string; data?: string; message?: string };
				}) => {
					setIsCompiling(false); // 编译完成

					if (data.type === "COMPILED_CODE") {
						setCompiledCode(data.data || "");
						setError("");
					} else if (data.type === "ERROR") {
						setError(data.message || "编译错误");
						// 不清空编译代码，保留上次成功的结果
						// setCompiledCode("");
					}
				}
			);

			compilerWorkerRef.current = worker;
		}

		return () => {
			// 清理所有创建的 URL
			urlPoolRef.current.forEach((url) => URL.revokeObjectURL(url));

			if (compilerWorkerRef.current) {
				compilerWorkerRef.current.terminate();
			}
		};
	}, []);

	const handleMessage = useCallback((msg: MessageData) => {
		const { type, message } = msg.data;
		if (type === "ERROR") {
			setError(message);
		}
	}, []);

	useEffect(() => {
		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [handleMessage]);

	const compileCode = useCallback(
		debounce((files: Record<string, { value: string }>) => {
			setIsCompiling(true); // 开始编译
			compilerWorkerRef.current?.postMessage(files);
		}, 800), // 减少防抖时间提高响应速度
		[]
	);

	useEffect(() => {
		compileCode(files);
	}, [files, compileCode]);

	// 优化 iframe URL 更新逻辑
	useEffect(() => {
		const importMapValue = files[IMPORT_MAP_FILE_NAME]?.value || "{}";

		const content = iframeRaw
			.replace(
				'<script type="importmap"></script>',
				`<script type="importmap">${importMapValue}</script>`
			)
			.replace(
				'<script type="module" id="appSrc"></script>',
				`<script type="module" id="appSrc">${compiledCode}</script>`
			);

		// 检查内容是否真的变化了
		if (content === lastContentRef.current) {
			return; // 内容没变，不更新
		}

		lastContentRef.current = content;

		const newUrl = URL.createObjectURL(
			new Blob([content], { type: "text/html" })
		);

		// 将新 URL 添加到池中以便后续清理
		urlPoolRef.current.push(newUrl);

		// 只更新非活动 iframe 的 URL
		setIframeUrls((prev) => {
			const newUrls = [...prev] as [string, string];
			newUrls[inactiveIframeIndex] = newUrl;
			return newUrls;
		});

		// 限制 URL 池大小，避免内存泄漏
		if (urlPoolRef.current.length > 10) {
			const oldUrl = urlPoolRef.current.shift();
			if (oldUrl) URL.revokeObjectURL(oldUrl);
		}
	}, [compiledCode, files[IMPORT_MAP_FILE_NAME]?.value, inactiveIframeIndex]);

	// 优化 iframe 加载完成事件处理
	const handleIframeLoad = useCallback(() => {
		// 只有当非活动 iframe 有 URL 且内容已经准备好时才切换
		if (iframeUrls[inactiveIframeIndex] && !isCompiling) {
			// 延迟切换，避免频繁切换导致闪烁
			setTimeout(() => {
				setActiveIframeIndex((prev) => (prev === 0 ? 1 : 0));
			}, 50);
		}
	}, [activeIframeIndex, inactiveIframeIndex, iframeUrls, isCompiling]);

	return (
		<div className="h-screen w-full flex flex-col">
			{/* 显示错误按钮 */}
			<div className="flex items-center gap-2 p-2 border-b absolute z-[999] right-4 top-4 bg-gray-800 bg-opacity-70 rounded-md shadow-md px-3 py-2 hover:bg-opacity-90 transition-all duration-300">
				<span className="text-sm text-white font-medium">显示错误</span>
				<button
					className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
						showError ? "bg-green-500" : "bg-gray-500"
					}`}
					onClick={() => setShowError(!showError)}>
					<span
						className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 shadow-md ${
							showError ? "translate-x-5" : "translate-x-1"
						}`}
					/>
				</button>
			</div>
			<Allotment
				vertical
				className="h-full">
				<Allotment.Pane minSize={300}>
					<div className="h-full flex flex-col">
						<div className="flex-1 relative">
							{/* 双iframe实现 - 添加更平滑的过渡 */}
							<iframe
								src={iframeUrls[0]}
								className={`w-full h-full p-0 border-none absolute inset-0 transition-opacity duration-500 ${
									activeIframeIndex === 0 ? "opacity-100 z-10" : "opacity-0 z-0"
								}`}
								title="Preview-1"
								sandbox="allow-scripts allow-same-origin"
								onLoad={activeIframeIndex === 1 ? handleIframeLoad : undefined}
							/>
							<iframe
								src={iframeUrls[1]}
								className={`w-full h-full p-0 border-none absolute inset-0 transition-opacity duration-500 ${
									activeIframeIndex === 1 ? "opacity-100 z-10" : "opacity-0 z-0"
								}`}
								title="Preview-2"
								sandbox="allow-scripts allow-same-origin"
								onLoad={activeIframeIndex === 0 ? handleIframeLoad : undefined}
							/>
							{/* 加载指示器 - 只在编译中且没有内容时显示 */}
							<div
								className={`absolute inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-20 transition-opacity duration-300 ${
									isCompiling && !compiledCode
										? "opacity-100"
										: "opacity-0 pointer-events-none"
								}`}>
								<div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
							</div>
							{/* 错误显示 */}
							{error && showError && (
								<Message
									type="error"
									content={error}
								/>
							)}
						</div>
					</div>
				</Allotment.Pane>
			</Allotment>
		</div>
	);
}
