# StrSX: JSX-like UI Library Using Tagged Template Literals

This library provides a way to create reactive, component-based user interfaces using tagged template literals in JavaScript. It mimics JSX syntax and reactivity features found in frameworks like Preact, React and SolidJS **but operates without a build process or transpilation step**.

**Caution: this library was created as a fun hack and not meant for production use.**


## Usage Example

```jsx
// Counter Component
function Counter() {
	const count = signal(0);
	return StrSX`
        <div>
            <h1>Count: ${count}</h1>
            <button onClick="${() => { count.value++; }}">Increment</button>
        </div>
    `;
}

// Main Application
const App = StrSX`
    <div>
        <h1>My Counter App</h1>
        <Counter></Counter>
    </div>
`;

render(document.getElementById("app"), App);
```
