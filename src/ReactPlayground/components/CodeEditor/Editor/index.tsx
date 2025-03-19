import { useCallback, useEffect, useRef, Suspense } from "react";
import { OnMount, EditorProps } from "@monaco-editor/react";
import { lazy } from "react";
import { debounce } from "lodash-es";
import { editor, Range,languages } from "monaco-editor";
import { message } from "antd";
import { createATA, clearATA } from "./ata";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

export interface EditorFile {
	name: string;
	value: string;
	language: string;
}

interface Props {
	file: EditorFile;
	onChange?: EditorProps["onChange"];
	options?: editor.IStandaloneEditorConstructionOptions;
}

const EditorLoading = () => (
	<div className="flex items-center justify-center h-full w-full bg-gray-100 dark:bg-gray-800">
		<div className="text-center">
			<svg
				className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24">
				<circle
					className="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					strokeWidth="4"
				/>
				<path
					className="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				/>
			</svg>
			<p className="text-lg font-medium">正在加载编辑器</p>
			<p className="text-sm text-gray-500 dark:text-gray-400">
				准备代码编辑环境中...
			</p>
		</div>
	</div>
);

export default function Editor({ file, onChange, options }: Props) {
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
	const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
	const ataRef = useRef<ReturnType<typeof createATA> | null>(null);
	const fileRef = useRef(file); // 添加文件引用
	// 更新文件引用
	useEffect(() => {
		fileRef.current = file;
	}, [file]);
	// 清理 ATA
	useEffect(() => {
		return () => clearATA();
	}, []);

	// 格式化文档
	const formatDocument = useCallback(() => {
		if (!editorRef.current || !fileRef.current) return;

		try {
			editorRef.current.getAction("editor.action.formatDocument")?.run();
			const formattedCode = editorRef.current.getValue();
			// 使用 Promise.resolve() 确保异步操作完成
			Promise.resolve().then(() => {
				onChange?.(formattedCode, undefined as any);
				message.success("代码格式化成功", 0.5);
			});
		} catch (error) {
			console.error("格式化代码时出错:", error);
			message.error("代码格式化失败，请检查代码是否有语法错误", 1);
		}
	}, [onChange]);
	// 编辑器挂载处理
	const handleEditorMount: OnMount = (editor, monaco) => {
		editorRef.current = editor;
		monacoRef.current = monaco;

		editor.onDidChangeModelContent((e) => {
			if (!fileRef.current) return;
			const newValue = editor.getValue();
			onChange?.(newValue, e as any);
		});

		// 修改保存命令的处理方式
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
			if (!fileRef.current) return;
			// 使用 requestAnimationFrame 确保在下一帧执行
			requestAnimationFrame(() => {
				formatDocument();
			});
		});

		monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
			jsx: monaco.languages.typescript.JsxEmit.Preserve,
			esModuleInterop: true,
			allowNonTsExtensions: true,
			moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
			target: monaco.languages.typescript.ScriptTarget.ES2020,
			jsxFactory: 'React.createElement',  // 添加这行
    		jsxFragmentFactory: 'React.Fragment', // 添加这行
		});
		interface CompletionItem {
			label: string;
			kind:languages.CompletionItemKind;
			insertText: string;
			documentation: string;
			range: Range;
		}
		monaco.languages.registerCompletionItemProvider('typescript', {
			triggerCharacters: ['<', ' '],
			provideCompletionItems: (model, position) => {
				const wordInfo = model.getWordUntilPosition(position);
				const line = model.getLineContent(position.lineNumber);
				
				const range = {
				  startLineNumber: position.lineNumber,
				  endLineNumber: position.lineNumber,
				  startColumn: wordInfo.startColumn,
				  endColumn: wordInfo.endColumn
				};
			
		
			  const suggestions:CompletionItem[] = [];
			  
			  // 常用的 HTML/JSX 标签
			  const tags = ['div', 'span', 'p', 'button', 'input', 'form', 'section'];
			  
			  tags.forEach(tag => {
				suggestions.push({
				  label: tag,
				  kind: monaco.languages.CompletionItemKind.Snippet,
				  insertText: `${tag}></${tag}>`,
				  documentation: `Create a <${tag}> element`,
				  range:range as Range,
				});
			  });
		
			  return { suggestions };
			}
		  });
		  //自动补全HTML标签.
		  // 修改后的html-complete动作
editor.addAction({
	id: 'html-complete',
	label: 'HTML Complete',
	keybindings: [monaco.KeyCode.Tab],
	run: (ed) => {
	  const position = ed.getPosition();
	  if (!position) return;
	  
	  const model = ed.getModel();
	  if (!model) return;
	  
	  const word = model.getWordUntilPosition(position);
	  const line = model.getLineContent(position.lineNumber);
	  const beforeContent = line.substring(0, word.startColumn - 1);
	  
	  // 仅在检测到<标签时触发自动补全
	  if (beforeContent.endsWith('<')) {
		const tagName = word.word;
		if (tagName) {
		  const range = new monaco.Range(
			position.lineNumber,
			word.startColumn - 1,
			position.lineNumber,
			word.endColumn
		  );
		  
		  ed.executeEdits('html-complete', [{
			range,
			text: `<${tagName}></${tagName}>`, // 使用Snippet语法
			forceMoveMarkers: true
		  }]);
		  
		  // 设置光标到中间位置
		  ed.setPosition({
			lineNumber: position.lineNumber,
			column: word.startColumn + tagName.length + 1
		  });
		  return; // 阻止默认行为
		}
	  }
	  
	  // 没有触发自动补全时执行默认Tab行为
	  ed.trigger('keyboard', 'type', { text: '\t' });
	}
  });
  
		
		ataRef.current = createATA((code, path) => {
			monaco.languages.typescript.typescriptDefaults.addExtraLib(
				code,
				`file://${path}`
			);
		});

		const debouncedATA = debounce(
			() => ataRef.current?.(editor.getValue()),
			1000
		);
		editor.onDidChangeModelContent(() => debouncedATA());
		ataRef.current(editor.getValue());
	// 在handleEditorMount最后添加
editor.onKeyDown(e => {
	if (e.keyCode === monaco.KeyCode.Tab) {
	  console.log('Tab pressed:', {
		position: editor.getPosition()
	  });
	}
  });
  
	};

	const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
		minimap: { enabled: false },
		scrollBeyondLastLine: false,
		automaticLayout: true,
		quickSuggestions: { other: true, comments: true, strings: true },
		suggestOnTriggerCharacters: true,
		acceptSuggestionOnEnter: "on",
		tabCompletion: "on",
		wordBasedSuggestions: "allDocuments",
		inlineSuggest: { enabled: true },
		...options,
	};
	// 添加文件检查
	if (!file) {
		return null;
	}
	return (
		<div className="h-full w-full border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden flex flex-col relative">
			<Suspense fallback={<EditorLoading />}>
				<MonacoEditor
					height="100%"
					width="100%"
					language={file.language}
					value={file.value}
					onChange={onChange}
					options={defaultOptions}
					onMount={handleEditorMount}
					path={file.name}
				/>
			</Suspense>
		</div>
	);
}
