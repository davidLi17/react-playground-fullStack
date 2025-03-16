import { useCallback, useEffect, useRef, Suspense } from "react"; // 引入React的钩子和Suspense组件
import { OnMount, EditorProps } from "@monaco-editor/react"; // 引入Monaco编辑器的挂载接口和属性类型
import { lazy } from "react"; // 引入React的懒加载功能
import { debounce } from "lodash-es"; // 引入lodash的防抖函数
//@ts-ignore
import { editor, IPosition } from "monaco-editor"; // 引入Monaco编辑器的类型和接口
import { message } from "antd"; // 引入Ant Design的消息提示组件
// 移除AI补全相关导入
import { createATA, clearATA } from "./ata"; // 引入ATA创建和清理函数

const MonacoEditor = lazy(() => import("@monaco-editor/react")); // 懒加载Monaco编辑器组件

export interface EditorFile {
	name: string; // 文件名
	value: string; // 文件内容
	language: string; // 文件语言
}

interface Props {
	file: EditorFile; // 编辑的文件
	onChange?: EditorProps["onChange"]; // 内容变化时的回调函数
	options?: editor.IStandaloneEditorConstructionOptions; // 编辑器选项
}

const EditorLoading = () => ( // 编辑器加载时的显示组件
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

// 移除AI相关常量和函数

export default function Editor({ file, onChange, options }: Props) {
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null); // 编辑器实例的引用
	const monacoRef = useRef<typeof import("monaco-editor") | null>(null); // Monaco编辑器模块的引用
	const ataRef = useRef<ReturnType<typeof createATA> | null>(null); // ATA实例的引用
	// 移除AI相关的ref
	// 保留用于性能优化的ref
	const lastValueRef = useRef<string>(file.value); // 上次编辑器内容的引用
	const lastOnChangeTimeRef = useRef<number>(0); // 上次内容变化时间的引用

	// 创建一个防抖的onChange处理函数
	const debouncedOnChange = useCallback(
		debounce((value: string, event: any) => {
			// 只有当内容真正变化时才触发onChange
			if (value !== lastValueRef.current) {
				lastValueRef.current = value;
				onChange?.(value, event);
			}
		}, 500), // 500ms的延迟，可以根据需要调整
		[onChange]
	);

	// 清理ATA
	useEffect(() => {
		return () => clearATA();
	}, []);

	// 格式化文档
	const formatDocument = useCallback(() => {
		if (!editorRef.current) return;

		try {
			editorRef.current.getAction("editor.action.formatDocument")?.run();
			const formattedCode = editorRef.current.getValue();
			debouncedOnChange?.(formattedCode, undefined as any);
			localStorage.setItem("code", formattedCode);
			message.success("代码格式化成功", 0.5);
		} catch (error) {
			console.error("格式化代码时出错:", error);
			message.error("代码格式化失败，请检查代码是否有语法错误", 1);
		}
	}, [debouncedOnChange]);

	// 编辑器挂载处理
	const handleEditorMount: OnMount = (editor, monaco) => {
		editorRef.current = editor;
		monacoRef.current = monaco;

		// 设置编辑器事件处理
		editor.onDidChangeModelContent((e) => {
			// 获取编辑器当前值
			const newValue = editor.getValue();

			// 性能优化：检查是否与上次值相同
			if (newValue === lastValueRef.current) return;

			// 性能优化：限制onChange调用频率
			const now = Date.now();
			if (now - lastOnChangeTimeRef.current < 100) {
				// 100ms内不重复触发
				debouncedOnChange(newValue, e);
			} else {
				// 直接调用onChange
				lastValueRef.current = newValue;
				lastOnChangeTimeRef.current = now;
				onChange?.(newValue, e as any);
			}
		});

		// 添加快捷键命令
		editor.addCommand(
			monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
			formatDocument
		);

		// 设置TypeScript编译器选项
		monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
			jsx: monaco.languages.typescript.JsxEmit.Preserve,
			esModuleInterop: true,
			allowNonTsExtensions: true,
			moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
			target: monaco.languages.typescript.ScriptTarget.ES2020,
		});

		// 初始化ATA (Auto Type Acquisition)
		ataRef.current = createATA((code, path) => {
			console.log("Now:::下载类型文件!!!!");

			monaco.languages.typescript.typescriptDefaults.addExtraLib(
				code,
				`file://${path}`
			);
		});

		// 设置编辑器内容变化时的处理函数
		const debouncedATA = debounce(
			() => ataRef.current?.(editor.getValue()),
			1000
		);
		editor.onDidChangeModelContent(() => debouncedATA());
		ataRef.current(editor.getValue());
	};

	// 编辑器默认选项
	const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
		minimap: { enabled: false }, // 关闭小地图
		scrollBeyondLastLine: false, // 不滚动超出最后一行
		automaticLayout: true, // 自动布局
		quickSuggestions: { other: true, comments: true, strings: true }, // 快速建议配置
		suggestOnTriggerCharacters: true, // 触发字符时显示建议
		acceptSuggestionOnEnter: "on", // 回车键接受建议
		tabCompletion: "on", // Tab键补全
		wordBasedSuggestions: "allDocuments", // 基于单词的建议
		// 保留原生内联建议功能
		inlineSuggest: { enabled: true }, // 启用内联建议
		...options, // 合并外部传入的选项
	};

	// 渲染编辑器组件
	return (
		<div className="h-full w-full border border-gray-200 dark:border-gray-700 rounded-md overflow-auto">
			<Suspense fallback={<EditorLoading />}>
				<MonacoEditor
					height="100%" // 编辑器高度
					width="100%" // 编辑器宽度
					language={file.language} // 编辑器语言
					value={file.value} // 编辑器初始值
					onChange={onChange} // 内容变化时的回调
					options={defaultOptions} // 编辑器选项
					onMount={handleEditorMount} // 编辑器挂载时的处理函数
					path={file.name} // 编辑器文件路径
				/>
			</Suspense>
		</div>
	);
}