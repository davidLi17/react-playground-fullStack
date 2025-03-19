import {
	useContext,
	useCallback,
	useState,
	useRef,
	useEffect,
	useMemo,
} from "react";
import Editor from "./Editor";
import FileNameList from "./FileNameList";
import { PlaygroundContext } from "../../PlaygroundContext";
import { debounce } from "lodash-es";
import { Progress, InputNumber } from "antd";

export default function CodeEditor() {
	const { theme, files, setFiles, selectedFileName } =
		useContext(PlaygroundContext);
	const file = files[selectedFileName];

	// 进度条状态
	const [progress, setProgress] = useState(0);
	const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
	const [debounceTime, setDebounceTime] = useState(1500);
	// 清理定时器
	useEffect(() => {
		return () => {
			if (progressTimerRef.current) {
				clearTimeout(progressTimerRef.current);
			}
		};
	}, []);
	// 使用 useMemo 创建 debounced 函数
	const debouncedOnChange = useMemo(
		() =>
			debounce((value?: string, event?: any) => {
				if (value !== undefined && value !== files[selectedFileName].value) {
					// 开始显示进度条
					setProgress(30);
					if (progressTimerRef.current) {
						clearTimeout(progressTimerRef.current);
					}

					const timer1 = setTimeout(() => {
						setProgress(70);
						const timer2 = setTimeout(() => {
							setProgress(100);
							const timer3 = setTimeout(() => {
								setProgress(0);
							}, 500);
							progressTimerRef.current = timer3;
						}, 300);
						progressTimerRef.current = timer2;
					}, 200);
					progressTimerRef.current = timer1;

					// 更新文件内容
					setFiles({
						...files,
						[selectedFileName]: {
							...files[selectedFileName],
							value: value,
						},
					});
				}
			}, debounceTime),
		[files, selectedFileName, setFiles, debounceTime]
	);
	return (
		<div className="flex flex-col h-full w-full relative">
			<div className="flex items-center gap-4 relative">
				<FileNameList />
				<div className="flex items-center gap-2 absolute right-1">
					<span>代码传递到右边时间(秒):</span>
					<InputNumber
						min={0.1}
						max={10}
						step={0.1}
						value={debounceTime / 1000}
						onChange={(value) => {
							if (value) {
								setDebounceTime(Math.floor(value * 1000));
							}
						}}
						style={{ width: 100 }}
					/>
				</div>
			</div>
			<div className="flex-grow relative">
				{/* 进度条 */}
				<div
					className="absolute -top-12 left-0 right-0 z-[9999]"
					style={{ visibility: progress > 0 ? "visible" : "hidden" }}>
					<Progress
						percent={progress}
						showInfo={false}
						strokeColor={{
							from: "#108ee9",
							to: "#87d068",
						}}
						size="small"
						className="!m-0 !p-0"
					/>
				</div>
				<Editor
					file={file}
					onChange={debouncedOnChange}
					options={{
						theme: theme === "dark" ? "vs-dark" : "vs",
						wordWrap: "on",
						fontSize: 14,
						
					}}
				/>
			</div>
		</div>
	);
}
