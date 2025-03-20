import { useState } from "react";
import { useCopyToClipboard } from "react-use";
import "./App.css";

function App() {
	const [text, setText] = useState("");
	const [, copyToClipboard] = useCopyToClipboard();
	const [count, setCount] = useState(0);
	const [isCopying, setIsCopying] = useState(false);
	const handleCopy = () => {
		if (text) {
			copyToClipboard(text);
			alert("复制成功!");
		}
	};

	return (
		<div className="card">
			<h1>文本复制工具示例</h1>
			<div style={{ display: "flex", gap: "10px" }}>
				<input
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="请输入要复制的文本"
					style={{ padding: "8px", borderRadius: "4px" }}
				/>
				<button
					onClick={() => {
						setCount(count + 1);
						setIsCopying(true);
					}}
					style={{
						padding: "8px",
						borderRadius: "4px",
						backgroundColor: isCopying ? "#ccc" : "#007bff",
						color: "#fff",
					}}></button>
				<div>{isCopying ? "正在复制..." : "复制文本"}</div>
				<button onClick={handleCopy}>复制</button>
			</div>
		</div>
	);
}

export default App;
