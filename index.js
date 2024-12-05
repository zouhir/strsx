/**
 * Creates a reactive data source from initial data that triggers updates to the subscribers when its value changes.
 */
function signal(initialValue) {
	let currentValue = initialValue;
	const subscribers = new Set();

	return {
		get value() {
			return currentValue;
		},
		set value(newValue) {
			if (currentValue !== newValue) {
				currentValue = newValue;
				subscribers.forEach(sub => sub());
			}
		},
		subscribe(fn) {
			subscribers.add(fn);
			return () => subscribers.delete(fn);
		}
	};
}

/**
 * StrSX is a tagged template function that processes template literals containing HTML-like elements and inlined JS
 * expressions. "Magical" signal reactivity code lives here.
 */
function StrSX(strings, ...values) {
	const functionsMap = {};
	const signalsMap = {};
	let functionCount = 0;
	let signalCount = 0;

	const processedValues = values.map(value => {
		if (typeof value === 'function') {
			const placeholder = `%%FUNCTION_${functionCount}%%`;
			functionsMap[placeholder] = value;
			functionCount++;
			return placeholder;
		} else if (value && typeof value === 'object' && typeof value.subscribe === 'function') {
			const placeholder = `%%SIGNAL_${signalCount}%%`;
			signalsMap[placeholder] = value;
			signalCount++;
			return placeholder;
		} else {
			return value;
		}
	});

	const result = strings.reduce((acc, str, i) => {
		return acc + str + (processedValues[i] !== undefined ? processedValues[i] : '');
	}, '');

	// Wrap the DOM creation in a computation
	let dom;

	function computation() {
		const newDom = transpile(result, functionsMap, signalsMap).toDom();

		if (dom && dom.parentNode) {
			dom.parentNode.replaceChild(newDom, dom);
		}
		dom = newDom;
	}

	computation();

	return dom;
}

/**
 * Base JSX string to DOM-tree converter, also handles signals processing and DOM events.
 */
function transpile(htmlString, functionsMap = {}, signalsMap = {}) {
	// Replace function placeholders with data-handler attributes
	const processedHtml = htmlString.replace(/(on[A-Z]\w+)=["']%%FUNCTION_(\d+)%%["']/g, (match, eventAttr, funcId) => {
		return `data-handler-${eventAttr}="FUNCTION_${funcId}"`;
	});

	// Signals remain as placeholders in the text content

	// Handle custom components
	const transpiled = processedHtml.replace(/<([A-Z][A-Za-z0-9]*)/g, '<template data-jsx="$1"')
		.replace(/<\/[A-Z][A-Za-z0-9]*>/g, '</template>');

	return {
		toDom() {
			const template = document.createElement('template');
			template.innerHTML = transpiled;
			const fragment = template.content;

			// Attach event handlers
			Array.from(fragment.querySelectorAll('*')).forEach(el => {
				Array.from(el.attributes).forEach(attr => {
					if (attr.name.startsWith('data-handler-on')) {
						const eventAttr = attr.name.slice('data-handler-'.length); // e.g., 'onClick'
						const eventType = eventAttr.slice(2).toLowerCase(); // 'click'
						const funcKey = `%%FUNCTION_${attr.value.split('_')[1]}%%`;
						const func = functionsMap[funcKey];
						if (func) {
							el.addEventListener(eventType, func);
							el.removeAttribute(attr.name);
						}
					}
				});
			});

			// Process signals
			const processNode = (node) => {
				if (node.nodeType === Node.TEXT_NODE) {
					const matches = node.textContent.match(/%%SIGNAL_\d+%%/g);
					if (matches) {
						const parent = node.parentNode;
						const parts = node.textContent.split(/(%%SIGNAL_\d+%%)/g);
						const newNodes = parts.map(part => {
							if (signalsMap[part]) {
								const textNode = document.createTextNode(signalsMap[part].value);

								// Subscribe to signal changes
								signalsMap[part].subscribe(() => {
									textNode.textContent = signalsMap[part].value;
								});

								return textNode;
							} else {
								return document.createTextNode(part);
							}
						});
						newNodes.forEach(newNode => parent.insertBefore(newNode, node));
						parent.removeChild(node);
					}
				} else if (node.nodeType === Node.ELEMENT_NODE) {
					// Process attributes
					for (let attr of node.attributes) {
						if (attr.value.includes('%%SIGNAL_')) {
							const matches = attr.value.match(/%%SIGNAL_\d+%%/g);
							if (matches) {
								matches.forEach(match => {
									const signal = signalsMap[match];
									if (signal) {
										// Initial value
										attr.value = attr.value.replace(match, signal.value);

										// Subscribe to changes
										signal.subscribe(() => {
											attr.value = attr.value.replace(match, signal.value);
											node.setAttribute(attr.name, attr.value);
										});
									}
								});
							}
						}
					}
					// Recurse into child nodes
					node.childNodes.forEach(child => processNode(child));
				}
			};

			fragment.childNodes.forEach(child => processNode(child));

			// Process custom components
			Array.from(fragment.querySelectorAll('template[data-jsx]')).forEach(templateEl => {
				const componentName = templateEl.getAttribute('data-jsx');
				const componentFn = window[componentName];
				if (!componentFn) {
					throw new Error(`Unknown Component "${componentName}". Import it or create it.`);
				}

				// Create the component element
				const componentEl = componentFn();

				// Replace the template element with the component element
				templateEl.parentNode.replaceChild(componentEl, templateEl);
			});

			return fragment;
		}
	};
}

function render(root, node) {
	root.appendChild(node);
}

Object.assign(window, {
	render,
	signal,
	StrSX,
});
