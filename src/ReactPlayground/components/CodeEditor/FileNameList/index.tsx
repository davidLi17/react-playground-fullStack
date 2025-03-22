import { useContext, useEffect, useState } from "react"; // 从React库中导入useContext, useEffect, useState三个Hook
import { PlaygroundContext } from "../../../PlaygroundContext"; // 从上级目录的PlaygroundContext文件中导入PlaygroundContext

import { FileNameItem } from "./FileNameItem"; // 从当前目录的FileNameItem文件中导入FileNameItem组件
import styles from "./index.module.scss"; // 从当前目录的index.module.scss文件中导入样式
import {
	APP_COMPONENT_FILE_NAME,
	ENTRY_FILE_NAME,
	IMPORT_MAP_FILE_NAME,
} from "../../../files"; // 从上级目录的files文件中导入三个常量

export default function FileNameList() {
	// 定义一个名为FileNameList的默认导出函数组件
	const {
		files, // 文件对象
		removeFile, // 删除文件的函数
		addFile, // 添加文件的函数
		updateFileName, // 更新文件名的函数
		selectedFileName, // 当前选中的文件名
		setSelectedFileName, // 设置当前选中的文件名的函数
	} = useContext(PlaygroundContext); // 从PlaygroundContext上下文中获取这些值

	const [tabs, setTabs] = useState([""]); // 定义一个状态tabs，初始值为一个包含空字符串的数组，用于存储标签页名称

	useEffect(() => {
		// 使用useEffect Hook来监听files对象的变化
		setTabs(Object.keys(files)); // 当files变化时，更新tabs状态为files对象的键（即文件名）
	}, [files]); // 依赖项为files

	const handleEditComplete = (name: string, prevName: string) => {
		// 定义一个处理编辑完成的函数
		updateFileName(prevName, name); // 调用updateFileName函数更新文件名
		setSelectedFileName(name); // 设置当前选中的文件名为新文件名

		setCreating(false); // 设置创建状态为false
	};

	const [creating, setCreating] = useState(false); // 定义一个状态creating，初始值为false，用于标识是否正在创建新标签页

	const addTab = () => {
		// 定义一个添加新标签页的函数
		const newFileName = "Comp" + Math.random().toString().slice(2, 6) + ".tsx"; // 生成一个新的文件名
		addFile(newFileName); // 调用addFile函数添加新文件
		setSelectedFileName(newFileName); // 设置当前选中的文件名为新文件名
		setCreating(true); // 设置创建状态为true
	};

	const handleRemove = (name: string) => {
		// 定义一个处理删除文件的函数
		removeFile(name); // 调用removeFile函数删除文件
		setSelectedFileName(ENTRY_FILE_NAME); // 设置当前选中的文件名为ENTRY_FILE_NAME常量
	};

	const readonlyFileNames = [
		// 定义一个只读文件名的数组
		ENTRY_FILE_NAME, // 入口文件名
		IMPORT_MAP_FILE_NAME, // 导入映射文件名
		APP_COMPONENT_FILE_NAME, // 应用组件文件名
	];

	return (
		// 返回组件的JSX结构
		<div className={styles.tabs}>
			{" "}
			{/* 使用导入的样式 */}
			{tabs.map(
				(
					item,
					index,
					arr // 遍历tabs数组，生成FileNameItem组件
				) => (
					<FileNameItem
						key={item + index} // 设置组件的唯一键
						value={item} // 设置组件的值
						readonly={readonlyFileNames.includes(item)} // 设置组件是否只读
						creating={creating && index === arr.length - 1} // 设置组件是否正在创建
						actived={selectedFileName === item} // 设置组件是否激活
						onClick={() => setSelectedFileName(item)} // 设置点击时的回调函数
						onEditComplete={(name: string) => handleEditComplete(name, item)} // 设置编辑完成时的回调函数
						onRemove={() => handleRemove(item)}></FileNameItem> // 设置删除时的回调函数
				)
			)}
			<div
				className={styles.add} // 使用导入的样式
				onClick={addTab}>
				{" "}
				{/* 设置点击时的回调函数 */}+
			</div>
		</div>
	);
}
