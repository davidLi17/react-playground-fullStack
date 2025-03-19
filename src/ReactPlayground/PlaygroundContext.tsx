// 引入React及其相关Hooks和类型
import React, {
	PropsWithChildren,
	createContext,
	useCallback,
	useEffect,
	useState,
} from "react";
// 引入压缩和解压缩工具函数，以及文件名到语言的映射函数
import { compress, fileName2Language, uncompress } from "./utils";
// 引入初始文件数据
import { initFiles } from "./files";
import { debounce } from "lodash-es";

// 定义单个文件接口，包含文件名、文件内容和语言类型
export interface File {
	name: string; //文件名
	value: string; //文件内容
	language: string; //语言类型
}

// 定义文件集合接口，键为字符串，值为File类型
export interface Files {
	[key: string]: File;
}

// 定义Playground上下文接口，包含文件集合、选中的文件名、主题、以及一系列操作函数
export interface PlaygroundContext {
	files: Files;
	selectedFileName: string;
	theme: Theme;
	setTheme: (theme: Theme) => void;
	setSelectedFileName: (fileName: string) => void;
	setFiles: (files: Files) => void;
	addFile: (fileName: string) => void;
	removeFile: (fileName: string) => void;
	updateFileName: (oldFieldName: string, newFieldName: string) => void;
}

// 定义主题类型，只能是'light'或'dark'
export type Theme = "light" | "dark";

// 创建Playground上下文，提供初始值
export const PlaygroundContext = createContext<PlaygroundContext>({
	selectedFileName: "App.tsx",
} as PlaygroundContext);

// 从URL获取文件数据的函数
const getFilesFromUrl = () => {
	let files: Files | undefined;
	try {
		// 检查hash是否存在且不为空
		const hashValue = window.location.hash.slice(1);
		if (!hashValue) {
			return undefined;
		}

		// 解压缩URL中的hash部分，并解析为JSON
		const hash = uncompress(hashValue);

		// 验证解压后的数据是否为有效的JSON
		if (!hash) {
			return undefined;
		}

		files = JSON.parse(hash);

		// 验证解析后的数据是否符合Files接口
		if (!files || typeof files !== "object") {
			return undefined;
		}
	} catch (error) {
		// 发生错误时在控制台输出错误信息
		console.error("从URL获取文件数据失败:", error);
		// 确保返回undefined而不是可能的部分解析结果
		return undefined;
	}
	return files;
};

// 定义PlaygroundProvider组件，用于提供上下文数据
export const PlaygroundProvider = (props: PropsWithChildren) => {
	const { children } = props;
	// 使用useState初始化文件数据，优先从URL获取，如果没有则使用初始文件
	const [files, setFiles] = useState<Files>(getFilesFromUrl() || initFiles);
	// 初始化选中的文件名为'App.tsx'
	const [selectedFileName, setSelectedFileName] = useState("App.tsx");
	// 初始化主题为'light'
	const [theme, setTheme] = useState<Theme>("light");

	// 添加主题变化的副作用
	useEffect(() => {
		// 获取 HTML 根元素
		const htmlElement = document.documentElement;

		// 根据主题设置 Tailwind 的暗色模式类
		if (theme === "dark") {
			htmlElement.classList.add("dark");
		} else {
			htmlElement.classList.remove("dark");
		}

		// 同时设置一个自定义属性，可以在 CSS 中使用
		htmlElement.setAttribute("data-theme", theme);
	}, [theme]);

	// 添加文件的函数
	const addFile = (name: string) => {
		// 创建新文件对象，并更新文件集合
		files[name] = {
			name,
			language: fileName2Language(name),
			value: `import React, { useState, useEffect, useRef } from 'react';

			// 定义组件 ${name}
			const ${name}: React.FC = () => {
			  // 示例状态
			  const [count, setCount] = useState(0);
			
			  // 示例副作用
			  useEffect(() => {
				console.log(\`组件 ${name} 已挂载\`);
				return () => {
				  console.log(\`组件 ${name} 已卸载\`);
				};
			  }, []);
			
			  // 示例 Ref
			  const divRef = useRef(null);
			
			  return (
				<div ref={divRef}>
				  <h1>Hello, ${name}!</h1>
				  <p>当前计数: {count}</p>
				  <button onClick={() => setCount(count + 1)}>增加计数</button>
				</div>
			  );
			};
			
			export default ${name};
			`,
		};
		setFiles({ ...files });
	};

	// 删除文件的函数
	const removeFile = (name: string) => {
		// 从文件集合中删除指定文件，并更新文件集合
		delete files[name];
		setFiles({ ...files });
	};

	// 更新文件名的函数
	const updateFileName = (oldFieldName: string, newFieldName: string) => {
		// 如果旧文件名不存在或新文件名为空，则不执行操作
		if (
			!files[oldFieldName] ||
			newFieldName === undefined ||
			newFieldName === null
		)
			return;
		// 从文件集合中提取旧文件并删除，剩余部分存入rest
		const { [oldFieldName]: value, ...rest } = files;
		// 创建新文件对象，并更新语言和名称
		const newFile = {
			[newFieldName]: {
				...value,
				language: fileName2Language(newFieldName),
				name: newFieldName,
			},
		};
		// 更新文件集合，包含剩余文件和新文件
		setFiles({
			...rest,
			...newFile,
		});
	};

	// 在 PlaygroundProvider 中添加防抖的 hash 更新
	const debouncedUpdateHash = useCallback(
		debounce((files: Files) => {
			const hash = compress(JSON.stringify(files));
			window.location.hash = hash;
		}, 1000),
		[]
	);

	useEffect(() => {
		debouncedUpdateHash(files);
	}, [files, debouncedUpdateHash]);

	// 返回PlaygroundContext.Provider组件，提供上下文数据
	return (
		<PlaygroundContext.Provider
			value={{
				theme,
				setTheme,
				files,
				selectedFileName,
				setSelectedFileName,
				setFiles,
				addFile,
				removeFile,
				updateFileName,
			}}>
			{children}
		</PlaygroundContext.Provider>
	);
};
