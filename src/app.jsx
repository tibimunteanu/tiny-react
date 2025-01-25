import { createElement, render, useState } from "./tiny-react";

function Button({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>;
}

function Panel({ title, children }) {
  const [value, setValue] = useState("edit this");

  return (
    <div style="background: whitesmoke; padding: 10px;">
      <PanelTitle>{title}</PanelTitle>
      <PanelContent>
        <input
          type="text"
          value={value}
          onInput={(e) => setValue(e.target.value)}
        />
        <div>{value}</div>
        <div style="padding: 10px; border: 1px solid darkcyan;">{children}</div>
      </PanelContent>
    </div>
  );
}

function PanelTitle({ children }) {
  return <div style="font-weight: bold;">{children}</div>;
}

function PanelContent({ children }) {
  return (
    <div style="border: 1px solid gray;">PanelContent header: {children}</div>
  );
}

/** @jsx createElement */
function App() {
  const [counter, setCounter] = useState(1);
  const [toggle, setToggle] = useState(false);

  return (
    <div>
      Some text
      <Button onClick={() => setToggle((p) => !p)}>
        Toggle: {toggle.toString()}
      </Button>
      {toggle && (
        <Button onClick={() => setCounter((p) => p + 1)}>
          Count: {counter}
        </Button>
      )}
      <div style="max-width: 400px;">
        <Panel title={`Some panel title ${counter}`}>
          {toggle && (
            <div>
              <Button onClick={() => setCounter((p) => p + 1)}>
                Count: {counter}
              </Button>
            </div>
          )}
          Panel content text
        </Panel>
      </div>
    </div>
  );
}

const container = document.getElementById("root");
render(<App />, container);
