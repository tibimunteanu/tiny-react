let currentComponent = null;
let currentHookIndex = null;
let currentRoot = null;
let toUnmount = [];

// jsx
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children
        .flatMap((child) => child)
        .map((child) =>
          typeof child === "object"
            ? child
            : {
                type: "TEXT_ELEMENT",
                props: {
                  nodeValue: child,
                  children: [],
                },
              }
        ),
    },
  };
}

// render
function render(element, container) {
  currentRoot = {
    domNode: container,
    props: {
      children: [element],
    },
  };
  rerender();
}

function rerender() {
  const newRoot = {
    domNode: currentRoot.domNode,
    props: currentRoot.props,
    prev: currentRoot,
  };

  processComponent(newRoot);

  toUnmount.forEach(commit);
  toUnmount = [];

  commit(newRoot.props.children[0], 0);
  currentRoot = newRoot;
}

// process
function processComponent(component) {
  if (component.type instanceof Function) {
    updateFunctionComponent(component);
  } else {
    updateBuiltinComponent(component);
  }

  for (let child of component.props.children) {
    processComponent(child);
  }
}

function updateFunctionComponent(component) {
  // set global context for function component execution
  currentComponent = component;
  currentHookIndex = 0;
  currentComponent.hooks = [];

  const children = [component.type(component.props)];
  updateChildren(component, children);
}

function updateBuiltinComponent(component) {
  if (!component.domNode) {
    const isTextNode = component.type === "TEXT_ELEMENT";
    const isFalseLiteral = isTextNode && component.props.nodeValue === false;

    if (!isFalseLiteral) {
      component.domNode = isTextNode
        ? document.createTextNode("")
        : document.createElement(component.type);
    }
  }

  updateChildren(component, component.props.children);
}

function updateChildren(newComponent, newChildren) {
  let prevChildren = newComponent.prev && newComponent.prev.props.children;

  let maxLength = Math.max(
    newChildren.length,
    prevChildren ? prevChildren.length : 0
  );
  let newChildrenResult = [];

  for (let index = 0; index < maxLength; index++) {
    const newChild = newChildren[index];
    const prevChild = prevChildren && prevChildren[index];

    let newChildResult = null;

    const sameType = prevChild && newChild && newChild.type == prevChild.type;

    if (sameType) {
      newChildResult = {
        type: prevChild.type,
        props: newChild.props,
        domNode: prevChild.domNode,
        parent: newComponent,
        prev: prevChild,
        operation: "UPDATE",
      };
    }

    if (newChild && !sameType) {
      newChildResult = {
        type: newChild.type,
        props: newChild.props,
        domNode: null,
        parent: newComponent,
        prev: null,
        operation: "CREATE",
      };
    }

    if (prevChild && !sameType) {
      prevChild.operation = "UNMOUNT";
      toUnmount.push(prevChild);
    }

    if (newChildResult) {
      newChildrenResult.push(newChildResult);
    }
  }

  newComponent.props.children = newChildrenResult;
}

// commit
function commit(component, childIndex) {
  let parent = component.parent;
  while (!parent.domNode) {
    parent = parent.parent;
  }

  if (component.operation === "CREATE" && component.domNode != null) {
    if (parent.domNode.childNodes.length > childIndex) {
      parent.domNode.insertBefore(
        component.domNode,
        parent.domNode.childNodes[childIndex]
      );
    } else {
      parent.domNode.appendChild(component.domNode);
    }
    updateProps(component.domNode, {}, component.props);
  } else if (component.operation === "UPDATE" && component.domNode != null) {
    updateProps(component.domNode, component.prev.props, component.props);
  } else if (component.operation === "UNMOUNT") {
    unmount(component, parent.domNode);
  }

  if (component.operation !== "UNMOUNT") {
    let index = component.domNode ? 0 : childIndex;

    for (let child of component.props.children) {
      commit(child, index);
      index++;
    }
  }
}

function updateProps(domNode, prevProps, nextProps) {
  Object.keys(prevProps)
    .filter((k) => k !== "children")
    .forEach((k) => {
      const isEvent = k.startsWith("on");
      const isRemoved = !(k in nextProps);
      const isChanged = prevProps[k] !== nextProps[k];

      if (isEvent) {
        if (isRemoved || isChanged) {
          const eventType = k.toLowerCase().substring(2);
          domNode.removeEventListener(eventType, prevProps[k]);
        }
      } else {
        if (isRemoved) {
          domNode[k] = "";
        }
      }
    });

  Object.keys(nextProps)
    .filter((k) => k !== "children")
    .forEach((k) => {
      const isEvent = k.startsWith("on");
      const isAdded = !(k in prevProps);
      const isChanged = prevProps[k] !== nextProps[k];

      if (isAdded || isChanged) {
        if (isEvent) {
          const eventType = k.toLowerCase().substring(2);
          domNode.addEventListener(eventType, nextProps[k]);
        } else {
          domNode[k] = nextProps[k];
        }
      }
    });
}

function unmount(component, domNodeParent) {
  if (component.domNode) {
    domNodeParent.removeChild(component.domNode);
  } else {
    for (let child of component.props.children) {
      unmount(child, domNodeParent);
    }
  }
}

// hooks
function useState(initial) {
  const prevHook =
    currentComponent.prev &&
    currentComponent.prev.hooks &&
    currentComponent.prev.hooks[currentHookIndex];

  const hook = {
    state: prevHook ? prevHook.state : initial,
    queue: [],
  };

  const actions = prevHook ? prevHook.queue : [];
  actions.forEach((action) => {
    hook.state = action instanceof Function ? action(hook.state) : action;
  });

  const setState = (action) => {
    hook.queue.push(action);
    rerender();
  };

  currentComponent.hooks.push(hook);
  currentHookIndex++;

  return [hook.state, setState];
}

export { createElement, render, useState };
