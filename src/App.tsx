import ReactPlayground from "./ReactPlayground";
import { Analytics } from "@vercel/analytics/next";
import "./App.scss";
import { PlaygroundProvider } from "./ReactPlayground/PlaygroundContext";

function App() {
	return (
		<PlaygroundProvider>
			<ReactPlayground />
			<Analytics />
		</PlaygroundProvider>
	);
}

export default App;
