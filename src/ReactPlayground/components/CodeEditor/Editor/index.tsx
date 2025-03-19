import { useCallback, useEffect, useRef, Suspense } from "react"; // 引入React相关hooks和Suspense组件
import { OnMount, EditorProps, loader } from "@monaco-editor/react"; // 引入Monaco Editor的React组件和相关类型
import { lazy } from "react"; // 引入React的懒加载功能
import { debounce } from "lodash-es"; // 引入lodash库中的debounce函数
import { editor, Range, languages } from "monaco-editor"; // 引入Monaco Editor的核心模块和相关类型
import { message } from "antd"; // 引入Ant Design的消息提示组件
import { createATA, clearATA } from "./ata"; // 引入自定义的ATA相关函数

const MonacoEditor = lazy(() => import("@monaco-editor/react")); // 懒加载Monaco Editor组件

// 定义编辑器文件接口
export interface EditorFile {
	name: string; // 文件名
	value: string; // 文件内容
	language: string; // 文件语言
}

// 定义组件属性接口
interface Props {
	file: EditorFile; // 当前编辑的文件
	onChange?: EditorProps["onChange"]; // 文件内容变化的回调函数
	options?: editor.IStandaloneEditorConstructionOptions; // 编辑器的配置选项
}

// 定义编辑器加载时的显示组件
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

// 定义Editor组件
export default function Editor({ file, onChange, options }: Props) {
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null); // 用于引用编辑器实例
	const monacoRef = useRef<typeof import("monaco-editor") | null>(null); // 用于引用Monaco Editor模块
	const ataRef = useRef<ReturnType<typeof createATA> | null>(null); // 用于引用ATA实例
	const fileRef = useRef(file); // 用于引用当前文件

	// 更新文件引用
	useEffect(() => {
		fileRef.current = file;
	}, [file]);

	// 组件卸载时清理ATA
	useEffect(() => {
		return () => clearATA();
	}, []);

	// 配置Monaco Editor
	useEffect(() => {
		loader.config({
			"vs/nls": { availableLanguages: { "*": "zh-cn" } }, // 设置语言为中文
			//@ts-ignore
			"vs/editor/editor.main": {
				"editor.theme": "vs-dark", // 设置主题为暗黑模式
				"editor.fontFamily": "Fira Code, Consolas, Monaco, monospace", // 设置字体
				"editor.fontSize": 14, // 设置字体大小
				"editor.lineHeight": 24, // 设置行高
				"editor.autoSave": "afterDelay", // 设置自动保存
				"editor.autoSaveDelay": 1000, // 设置自动保存延迟时间
			},
		});
	}, []);

	// 格式化文档的函数
	const formatDocument = useCallback(() => {
		if (!editorRef.current || !fileRef.current) return;

		try {
			editorRef.current.getAction("editor.action.formatDocument")?.run(); // 执行格式化操作
			const formattedCode = editorRef.current.getValue(); // 获取格式化后的代码
			Promise.resolve().then(() => {
				onChange?.(formattedCode, undefined as any); // 触发onChange回调
				message.success("代码格式化成功", 0.5); // 显示成功提示
			});
		} catch (error) {
			console.error("格式化代码时出错:", error); // 打印错误信息
			message.error("代码格式化失败，请检查代码是否有语法错误", 1); // 显示错误提示
		}
	}, [onChange]);

	// 编辑器挂载时的处理函数
	const handleEditorMount: OnMount = (editor, monaco) => {
		editorRef.current = editor; // 设置编辑器实例引用
		monacoRef.current = monaco; // 设置Monaco模块引用

		editor.onDidChangeModelContent((e) => {
			if (!fileRef.current) return;
			const newValue = editor.getValue(); // 获取当前编辑器内容
			onChange?.(newValue, e as any); // 触发onChange回调
		});

		// 绑定快捷键Ctrl+S触发格式化操作
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
			if (!fileRef.current) return;
			requestAnimationFrame(() => {
				formatDocument(); // 格式化文档
			});
		});

		// 配置TypeScript编译选项
		monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
			jsx: monaco.languages.typescript.JsxEmit.React, // 设置JSX模式
			esModuleInterop: true, // 启用ES模块互操作
			allowNonTsExtensions: true, // 允许非TS扩展
			moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs, // 设置模块解析方式
			target: monaco.languages.typescript.ScriptTarget.ES2020, // 设置目标语言版本
			jsxFactory: "React.createElement", // 设置JSX工厂函数
			jsxFragmentFactory: "React.Fragment", // 设置JSX片段工厂函数
		});

		// 注册补全提供器
		monaco.languages.registerCompletionItemProvider("typescript", {
			triggerCharacters: ["<"], // 设置触发字符
			provideCompletionItems: (model, position) => {
				const line = model.getLineContent(position.lineNumber); // 获取当前行内容
				const beforeCursor = line.substring(0, position.column - 1); // 获取光标前内容

				const tagMatch = beforeCursor.match(/<([a-zA-Z]*)$/); // 匹配标签
				if (!tagMatch) return { suggestions: [] };
				const [fullMatch, partialTag] = tagMatch;
				const startOffset = beforeCursor.lastIndexOf("<");

				const range = {
					startLineNumber: position.lineNumber,
					endLineNumber: position.lineNumber,
					startColumn: startOffset + 2,
					endColumn: position.column,
				};
				const htmlTags = [
					"div",
					"span",
					"button",
					"input",
					"form",
					"section",
					"p",
					"a",
					"textarea",
					"ul",
					"ol",
					"li",
					"header",
					"footer",
					"main",
					"article",
					"nav",
					"aside",
					"table",
				]; // 常用HTML标签
				const suggestions = htmlTags
					.filter((tag) => tag.startsWith(partialTag)) // 过滤匹配的标签
					.map((tag) => ({
						label: tag,
						kind: monaco.languages.CompletionItemKind.Snippet, // 设置补全项类型
						insertText: `${tag}>$0</${tag}>`, // 设置插入文本
						documentation: `<${tag}> 元素`, // 设置文档说明
						range: range as Range, // 设置范围
						insertTextRules:
							monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, // 设置插入文本规则
						detail: "HTML元素", // 设置详细信息
						filterText: `<${partialTag}`, // 设置过滤文本
						sortText: tag.length.toString().padStart(4, "0"), // 设置排序文本
					}));
				return { suggestions };
			},
		});

		// 创建ATA实例
		ataRef.current = createATA((code, path) => {
			//这里就是添加外部TS库的核心代码.
			monaco.languages.typescript.typescriptDefaults.addExtraLib(
				code,
				`file://${path}`
			); // 添加额外库// 将下载的类型文件添加到 TypeScript 环境中
		});

		// 防抖处理ATA更新
		const debouncedATA = debounce(
			() => ataRef.current?.(editor.getValue()),
			1000
		);
		editor.onDidChangeModelContent(() => debouncedATA()); // 绑定内容变化事件
		ataRef.current(editor.getValue()); // 初始调用ATA

		// editor.onDidChangeCursorPosition((e) => {
		// 	const model = editor.getModel();
		// 	if (!model) return;

		// 	// 更复杂的表格示例
		// 	const debugInfo = [
		// 		{
		// 			// 事件: "光标移动",
		// 			// 时间: new Date().toLocaleTimeString(),
		// 			行号: e.position.lineNumber,
		// 			列号: e.position.column,
		// 			选中文本:
		// 				editor
		// 					.getModel()
		// 					?.getValueInRange(
		// 						editor.getSelection() || new monaco.Range(0, 0, 0, 0)
		// 					) || "",
		// 			当前字符: model.getValueInRange({
		// 				startLineNumber: e.position.lineNumber,
		// 				startColumn: e.position.column,
		// 				endLineNumber: e.position.lineNumber,
		// 				endColumn: e.position.column + 1,
		// 			}),
		// 			// 语言: model.getLanguageId(),
		// 		},
		// 	];

		// 	console.table(debugInfo);
		// });

		// 修改CapsLock键处理动作

		// 添加键盘事件监听器
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.code === "CapsLock") {
				console.log("Editor/index.tsx CapsLock 按下");

				e.preventDefault(); // 阻止默认的 CapsLock 行为
			}
		};

		// 获取编辑器的 DOM 元素
		const editorElement = editor.getDomNode();
		if (editorElement) {
			editorElement.addEventListener("keydown", handleKeydown, true);
		}

		editor.addAction({
			id: "smart-capslock-completion",
			label: "Smart CapsLock Completion",
			keybindings: [monaco.KeyCode.CapsLock],
			run: (ed) => {
				const position = ed.getPosition();
				if (!position) return;

				const model = ed.getModel();
				if (!model) return;

				// 获取当前行内容
				const line = model.getLineContent(position.lineNumber);
				const beforeCursor = line.substring(0, position.column - 1);

				// 匹配两种场景：直接输入标签名 或 <开头的标签
				const tagMatch = beforeCursor.match(/(?:<)?([a-zA-Z]+)$/);
				if (!tagMatch) return;

				const [fullMatch, partialTag] = tagMatch;
				const isJsx = fullMatch.startsWith("<");
				const validTags = ["button", "div", "input", "span"];

				// 查找匹配标签
				const matchedTag = validTags.find((t) => t.startsWith(partialTag));
				if (!matchedTag) return;

				// 计算替换范围
				const startColumn =
					position.column - partialTag.length - (isJsx ? 1 : 0);
				const endColumn = position.column;

				// 执行替换
				ed.executeEdits("capslock-completion", [
					{
						range: new monaco.Range(
							position.lineNumber,
							startColumn,
							position.lineNumber,
							endColumn
						),
						text: `<${matchedTag}></${matchedTag}>`,
						forceMoveMarkers: true,
					},
				]);

				// 移动光标到属性位置
				const newPosition = new monaco.Position(
					position.lineNumber,
					startColumn + matchedTag.length + (isJsx ? 2 : 1)
				);
				ed.setPosition(newPosition);
			},
		});
	};

	// 设置默认编辑器配置选项
	const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
		minimap: { enabled: false }, // 禁用小地图
		scrollBeyondLastLine: false, // 不滚动超过最后一行
		automaticLayout: true,
		quickSuggestions: { other: true, comments: true, strings: true }, // 快速提示
		suggestOnTriggerCharacters: true, // 触发字符时提示
		acceptSuggestionOnEnter: "on", // 回车接受提示
		tabCompletion: "on", // Tab补全
		wordBasedSuggestions: "allDocuments", // 基于单词的提示
		inlineSuggest: { enabled: true }, // 启用内联提示
		fontSize: 14, // 字体大小
		fontFamily: "Fira Code, Consolas, Monaco, monospace", // 字体
		fontLigatures: true, // 字体连字
		lineHeight: 24, // 行高
		renderWhitespace: "selection", // 渲染空格
		bracketPairColorization: { enabled: true }, // 括号对颜色化
		guides: {
			bracketPairs: true, // 括号对指南
			indentation: true, // 缩进指南
		},
		cursorBlinking: "smooth", // 光标闪烁
		smoothScrolling: true, // 平滑滚动
		mouseWheelZoom: true, // 鼠标滚轮缩放
		formatOnPaste: true, // 粘贴时格式化
		formatOnType: true, // 输入时格式化
		autoClosingBrackets: "always", // 自动闭合括号
		autoClosingQuotes: "always", // 自动闭合引号
		autoIndent: "full", // 自动缩进
		...options, // 合并外部传入的配置选项
	};

	// 如果文件不存在，返回null
	if (!file) {
		return null;
	}

	return (
		<div className="h-full w-full border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden flex flex-col relative">
			<Suspense fallback={<EditorLoading />}>
				<MonacoEditor
					height="100%" // 设置编辑器高度
					width="100%" // 设置编辑器宽度
					language={file.language} // 设置编辑器语言
					value={file.value} // 设置编辑器初始值
					onChange={onChange} // 设置内容变化回调
					options={defaultOptions} // 设置编辑器配置选项
					onMount={handleEditorMount} // 设置编辑器挂载回调
					path={file.name} // 设置编辑器路径
				/>
			</Suspense>
		</div>
	);
}
