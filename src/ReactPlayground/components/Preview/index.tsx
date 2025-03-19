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
	const [iframeUrl, setIframeUrl] = useState<string>("");
	const [showError, setShowError] = useState(false);

	const compilerWorkerRef = useRef<Worker | null>(null);
	const prevUrlRef = useRef<string>("");

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
					if (data.type === "COMPILED_CODE") {
						setCompiledCode(data.data || "");
						setError("");
					} else if (data.type === "ERROR") {
						setError(data.message || "编译错误");
						setCompiledCode("");
					}
				}
			);

			compilerWorkerRef.current = worker;
		}

		return () => {
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
			compilerWorkerRef.current?.postMessage(files);
		}, 1000),
		[]
	);

	useEffect(() => {
		compileCode(files);
	}, [files, compileCode]);

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

		const newUrl = URL.createObjectURL(
			new Blob([content], { type: "text/html" })
		);

		if (prevUrlRef.current) {
			URL.revokeObjectURL(prevUrlRef.current);
		}

		setIframeUrl(newUrl);
		prevUrlRef.current = newUrl;

		return () => {
			if (newUrl) {
				URL.revokeObjectURL(newUrl);
			}
		};
	}, [compiledCode, files[IMPORT_MAP_FILE_NAME]?.value]);

	return (
		<div className="h-screen w-full flex flex-col">
			<div className="flex items-center gap-2 p-2 border-b absolute z-10 right-4 top-4 bg-gray-800 bg-opacity-70 rounded-md shadow-md px-3 py-2 hover:bg-opacity-90 transition-all duration-300">
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
							{iframeUrl && (
								<iframe
									src={iframeUrl}
									className="w-full h-full p-0 border-none"
									title="Preview"
									sandbox="allow-scripts allow-same-origin"
								/>
							)}
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
