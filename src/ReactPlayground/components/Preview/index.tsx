import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { PlaygroundContext } from "../../PlaygroundContext";
import Editor from "../CodeEditor/Editor";
import iframeRaw from "./iframe.html?raw";
import { IMPORT_MAP_FILE_NAME } from "../../files";
import { Message } from "../Message";
import CompilerWorker from "./compiler.worker?worker";
import { debounce } from "lodash-es";
import { Allotment } from "allotment";
import "allotment/dist/style.css";

// Define message data interface outside component to avoid recreation
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

	// Use useRef for values that shouldn't trigger re-renders
	const compilerWorkerRef = useRef<Worker | null>(null);
	const prevUrlRef = useRef<string>("");

	// Initialize the compiler worker once
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

		// Cleanup worker on component unmount
		return () => {
			if (compilerWorkerRef.current) {
				compilerWorkerRef.current.terminate();
			}
		};
	}, []);

	// Create memoized message handler
	const handleMessage = useCallback((msg: MessageData) => {
		const { type, message } = msg.data;
		if (type === "ERROR") {
			setError(message);
		}
	}, []);

	// Set up message listener
	useEffect(() => {
		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [handleMessage]);

	// Debounced compiler function
	const compileCode = useCallback(
		debounce((files: Record<string, { value: string }>) => {
			compilerWorkerRef.current?.postMessage(files);
		}, 1000),
		[]
	);

	// Trigger compilation when files change
	useEffect(() => {
		compileCode(files);
	}, [files, compileCode]);

	// Generate and update iframe URL when dependencies change
	useEffect(() => {
		// Only generate new URL when compiledCode or error changes
		const importMapValue = files[IMPORT_MAP_FILE_NAME]?.value || "{}";

		const errorHtml = error
			? `
      <div style="
        padding: 20px;
        color: #ff4d4f;
        background: #fff2f0;
        border: 1px solid #ffccc7;
        border-radius: 4px;
        font-family: system-ui;
        white-space: pre-wrap;
      ">
        <h3 style="margin: 0 0 10px">编译错误</h3>
        <pre style="margin: 0;font-size:1.5rem;">${error}</pre>
      </div>
    `
			: "";

		const content = iframeRaw
			.replace(
				'<script type="importmap"></script>',
				`<script type="importmap">${importMapValue}</script>`
			)
			.replace(
				'<script type="module" id="appSrc"></script>',
				error
					? errorHtml
					: `<script type="module" id="appSrc">${compiledCode}</script>`
			);

		// Create new Blob URL
		const newUrl = URL.createObjectURL(
			new Blob([content], { type: "text/html" })
		);

		// Revoke previous URL to prevent memory leaks
		if (prevUrlRef.current) {
			URL.revokeObjectURL(prevUrlRef.current);
		}

		// Update state and reference
		setIframeUrl(newUrl);
		prevUrlRef.current = newUrl;

		// Cleanup function to revoke URL when component unmounts or URL changes
		return () => {
			if (newUrl) {
				URL.revokeObjectURL(newUrl);
			}
		};
	}, [compiledCode, error, files[IMPORT_MAP_FILE_NAME]?.value]);

	return (
		<div className="h-screen w-full flex flex-col">
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
							{error && (
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
