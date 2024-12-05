function Counter() {
	const count = signal(0);
	return StrSX`
        <div>
            <h1>Count: ${count}</h1>
            <button onClick="${() => { count.value++; }}">Increment</button>
        </div>
    `;
}

const App = StrSX`
    <div>
        <h1>My Counter App</h1>
        <Counter></Counter>
    </div>
`;

render(document.getElementById("app"), App);
