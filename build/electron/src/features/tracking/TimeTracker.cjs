"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeTracker = TimeTracker;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function TimeTracker() {
    const [running, setRunning] = (0, react_1.useState)(false);
    const [label, setLabel] = (0, react_1.useState)('');
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("input", { placeholder: "Task label", value: label, onChange: e => setLabel(e.target.value) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setRunning(!running), children: running ? 'Stop' : 'Start' })] }));
}
