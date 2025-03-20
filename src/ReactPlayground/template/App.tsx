import { useState } from "react";
import React from "react";
import "./App.css";

function App() {
	const [count, setCount] = useState(0);
	const [isVisible, setIsVisible] = useState(true);
	const [inputValue, setInputValue] = useState("");

	const handleIncrement = () => {
		setCount((prev) => prev + 1);
	};

	const handleDecrement = () => {
		setCount((prev) => prev - 1);
	};

	const handleReset = () => {
		setCount(0);
	};

	const toggleVisibility = () => {
		setIsVisible((prev) => !prev);
	};

	return (
		<div className={`card`}>
			<h1>增强版计数器</h1>

			{isVisible && (
				<div className="counter-section">
					<h2>当前计数: {count}</h2>
					<div className="input-section">
						<input
							type="number"
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							placeholder="输入数字"
						/>
						<button onClick={() => setCount(Number(inputValue))}>
							设置数值
						</button>
					</div>
				</div>
			)}

			<div className="button-group">
				<button onClick={handleIncrement}>增加</button>
				<button onClick={handleDecrement}>减少</button>
				<button onClick={handleReset}>重置</button>
				<button onClick={toggleVisibility}>
					{isVisible ? "隐藏" : "显示"}计数器
				</button>
			</div>

			<div className="status-section">
				<p>计数状态: {count > 0 ? "正数" : count < 0 ? "负数" : "零"}</p>
				<p>是否为偶数: {count % 2 === 0 ? "是" : "否"}</p>
			</div>
		</div>
	);
}

export default App;
