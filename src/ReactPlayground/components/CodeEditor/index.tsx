import { useContext, useCallback } from "react";
import Editor from "./Editor";
import FileNameList from "./FileNameList";
import { PlaygroundContext } from "../../PlaygroundContext";
import { debounce } from "lodash-es";

export default function CodeEditor() {
	const { theme, files, setFiles, selectedFileName, setSelectedFileName } =
		useContext(PlaygroundContext);

	const file = files[selectedFileName];

	// 使用 useCallback 和 debounce 包装 onEditorChange 函数
	const onEditorChange = useCallback(
		debounce((value?: string) => {
			if (value !== undefined && value !== files[selectedFileName].value) {
				const newFiles = {
					...files,
					[selectedFileName]: {
						...files[selectedFileName],
						value: value,
					},
				};
				setFiles(newFiles);
			}
		}, 500), // 增加延迟到500ms，减少更新频率
		[files, selectedFileName, setFiles]
	);

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<FileNameList />
			<Editor
				file={file}
				onChange={onEditorChange}
				options={{
					theme: `vs-${theme}`,
				}}
			/>
		</div>
	);
}
